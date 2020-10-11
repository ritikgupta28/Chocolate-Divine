const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator');

const PDFDocument = require('pdfkit');

const Product = require('../models/product');
const Order = require('../models/order');

const ITEMS_PER_PAGE = 4;

const https = require('https');
const qs = require('querystring');
const checksum_lib = require('../paytm/checksum');

var PaytmConfig = {
	mid: process.env.MID,
	key: process.env.KEY,
	website: process.env.WEBSITE
}

exports.getProducts = (req, res, next) => {
	const page = +req.query.page || 1;
	let totalItems;

	Product.find()
		.countDocuments()
		.then(numProducts => {
			totalItems = numProducts;
			return Product.find()
				.skip((page - 1) * ITEMS_PER_PAGE)
				.limit(ITEMS_PER_PAGE);
		})
		.then(products => {
			res.render('shop/product-list', {
				prods: products,
				pageTitle: 'Products',
				path: '/products',
				currentPage: page,
				hasNextPage: ITEMS_PER_PAGE * page < totalItems,
				hasPreviousPage: page > 1,
				nextPage: page + 1,
				previousPage: page - 1,
				lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE)
			});
		})
		.catch(err => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.getIndex = (req, res, next) => {
	Product.find()
		.then(products => {
			res.render('shop/index', {
				prods: products,
				pageTitle: 'Shop',
				path: '/',
			});
		})
		.catch(err => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.getCart = (req, res, next) => {
	req.user
		.populate('cart.items.productId')
		.execPopulate()
		.then(user => {
			const products = user.cart.items;
			res.render('shop/cart', {
				path: '/cart',
				pageTitle: 'Your Cart',
				products: products
			});
		})
		.catch(err => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.postCart = (req, res, next) => {
	const prodId = req.body.productId;
	const quantity = req.body.quantity;
	if(quantity<1) {
		res.redirect('/products');
	}

	Product.findById(prodId)
		.then(product => {
			return req.user.addToCart(product, quantity);
		})
		.then(result => {
			res.redirect('/cart');
		})
		.catch(err => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.postCartDeleteProduct = (req, res, next) => {
	const prodId = req.body.productId;
	req.user
		.removeFromCart(prodId)
		.then(result => {
			res.redirect('/cart');
		})
		.catch(err => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.getCheckout = (req, res, next) => {
	req.user
		.populate('cart.items.productId')
		.execPopulate()
		.then(user => {
			const products = user.cart.items;
			let total = 0;
			products.forEach(p => {
				total += p.quantity * p.productId.price;
			});
			res.render('shop/checkout', {
				path: '/checkout',
				pageTitle: 'Checkout',
				products: products,
				totalSum: total,
	    		errorMessage: null,
    			validationErrors: []
			});
		})
		.catch(err => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.postCheckout = (req, res, next) => {
	const name = req.body.naam;
	const location = req.body.location;
	const number = req.body.nmbr;
	const city = req.body.city;
	const pincode = req.body.pincode;
	const paymentType = req.body.paymentMode;
	let totalSum = 0;

	const errors = validationResult(req);

	if(!errors.isEmpty()) {
		req.user
		.populate('cart.items.productId')
		.execPopulate()
		.then(user => {
			const products = user.cart.items;
			let total = 0;
			products.forEach(p => {
				total += p.quantity * p.productId.price;
			});
			return res.status(422).render('shop/checkout', {
				path: '/checkout',
				pageTitle: 'Checkout',
				products: products,
				totalSum: total,
				errorMessage: errors.array()[0].msg,
				validationErrors: errors.array()
			});
		});
	}

	req.user
		.populate('cart.items.productId')
		.execPopulate()
		.then(user => {
			user.cart.items.forEach(p => {
				totalSum += p.quantity * p.productId.price;
			});

			const products = user.cart.items.map(i => {
				return { quantity: i.quantity, product: { ...i.productId._doc } };
			});
			const order = new Order({
				products: products,
				user: {
					email: req.user.email,
					userId: req.user
				},
				paymentType: paymentType,
				address: {
					name: name,
					location: location,
					number: number,
					city: city,
					pincode: pincode
				}
			});
			return order.save();
		})
		.then(result => {
			if(paymentType === "delivery") {
				req.user.clearCart();
				res.redirect('/orders');
			}
			else {
				var params = {};
				params['MID'] = PaytmConfig.mid;
				params['WEBSITE']	= PaytmConfig.website;
				params['CHANNEL_ID'] = 'WEB';
				params['INDUSTRY_TYPE_ID'] = 'Retail';
				params['ORDER_ID'] = result._id.toString();
				params['CUST_ID'] = req.user._id.toString();
				params['TXN_AMOUNT'] = totalSum;
				params['CALLBACK_URL'] = 'http://localhost:3000' + '/callback';
				params['EMAIL']	= req.user.email;
				params['MOBILE_NO']	= result.address.number;

				checksum_lib.genchecksum(params, PaytmConfig.key, function (err, checksum) {
					var txn_url = "https://securegw-stage.paytm.in/order/process"; // for staging
					// var txn_url = "https://securegw.paytm.in/theia/processTransaction"; // for production

					var form_fields = "";
					for(var x in params) {
						form_fields += "<input type='hidden' name='"+x+"' value='"+params[x]+"' >";
					}
					form_fields += "<input type='hidden' name='CHECKSUMHASH' value='"+checksum+"' >";

					res.writeHead(200, {'Content-Type': 'text/html'});
					res.write('<html><head><title>Checkout Page</title></head><body><center><h1>Please wait! Do not refresh this page...</h1></center><form method="post" action="'+txn_url+'" name="f1">'+form_fields+'</form><script src="/js/paytm.js"></script></body></html>');
					res.end();
				});
				req.user.clearCart();
			}
		})
		.catch(err => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.callback = (req, res, next) => {
	var body = '';
	req.on('data', function (data) {
		body += data;
	});
	req.on('end', function () {
		var html = "";
		html += "<a href='http://localhost:3000/orders'>Go to Orders</a>";
		html += "<br/><br/>";
		var post_data = qs.parse(body);
		// verify the checksum
		var checksumhash = post_data.CHECKSUMHASH;
		// delete post_data.CHECKSUMHASH;
		var result = checksum_lib.verifychecksum(post_data, PaytmConfig.key, checksumhash);
		// received params in callback
		if(result) {
		html += "<b>Callback Response</b><br>";
		for(var x in post_data) {
			html += x + " => " + post_data[x] + "<br/>";
		}
	}
		html += "<br/><br/>";
		// html += "<br/><br/>";
		const pay = post_data["STATUS"];
		var paymentComplete = false;
		Order.findById(post_data.ORDERID)
			.then(order => {
				if(order) {
					console.log(order);
					if(pay === "TXN_SUCCESS") {
						order.paymentDone = true;
						paymentComplete = true;
						order.save();
					}
				}
			})
			.catch(err => {
				const error = new Error(err);
			  error.httpStatusCode = 500;
			  return next(error);
			})
			console.log(paymentComplete);
		setTimeout(() => {
			if(!paymentComplete) {
			Order.deleteOne({ _id: post_data.ORDERID }, function (err) {
				if(err) {
					const error = new Error(err);
				  error.httpStatusCode = 500;
				  return next(error);
				}
			});
		} 
	}, 2000);
		// Send Server-to-Server request to verify Order Status
		var params = {"MID": PaytmConfig.mid, "ORDERID": post_data.ORDERID};
		checksum_lib.genchecksum(params, PaytmConfig.key, function (err, checksum) {
			params.CHECKSUMHASH = checksum;
			post_data = 'JsonData='+JSON.stringify(params);
			var options = {
				hostname: 'securegw-stage.paytm.in', // for staging
				// hostname: 'securegw.paytm.in', // for production
				port: 443,
				path: '/merchant-status/getTxnStatus',
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Content-Length': post_data.length
				}
			};
			// Set up the request
			var response = "";
			var post_req = https.request(options, function(post_res) {
				post_res.on('data', function (chunk) {
					response += chunk;
				});
				post_res.on('end', function() {
					var _result = JSON.parse(response);
					// html += "<b>Status Check Response</b><br>";
					// for(var x in _result) {
						// html += x + " => " + _result[x] + "<br/>";
					// }
					res.writeHead(200, {'Content-Type': 'text/html'});
					res.write(html);
					res.end();
				});
			});

			// post the data
			post_req.write(post_data);
			post_req.end();
		});
	});
};

exports.postReadyMark = (req, res, next) => {
	const orderId = req.params.orderId;
	Order.findById(orderId)
		.then(order => {
			if(order.isDone === -1) {
				order.isDone = 0;
			}
			return order.save();
		})
		.catch(err => {
		  const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
		setTimeout(() => {
			if(req.user.email === process.env.ADMIN_EMAIL) {
				Order.find().sort({'isDone': 1})
					.then(orders => {
						res.render('shop/orders', {
							path: '/orders',
							pageTitle: 'Your Orders',
							orders: orders
						});
					})
					.catch(err => {
						const error = new Error(err);
						error.httpStatusCode = 500;
						return next(error);
					});
			}
			else {
				Order.find({ 'user.userId': req.user._id }).sort({'isDone': 1})
					.then(orders => {
						res.render('shop/orders', {
							path: '/orders',
							pageTitle: 'Your Orders',
							orders: orders
						});
					})
					.catch(err => {
						const error = new Error(err);
						error.httpStatusCode = 500;
						return next(error);
					});
			}
		}, 1000);
}

exports.postDeliveryMark = (req, res, next) => {
	const orderId = req.params.orderId;
	Order.findById(orderId)
		.then(order => {
			if(order.isDone === 0) {
				order.isDone = 1;
			}
			return order.save();
		})
		.catch(err => {
		  const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
		setTimeout(() => {
			if(req.user.email === process.env.ADMIN_EMAIL) {
				Order.find().sort({'isDone': 1})
					.then(orders => {
						res.render('shop/orders', {
							path: '/orders',
							pageTitle: 'Your Orders',
							orders: orders
						});
					})
					.catch(err => {
						const error = new Error(err);
						error.httpStatusCode = 500;
						return next(error);
					});
			}
			else {
				Order.find({ 'user.userId': req.user._id }).sort({'isDone': 1})
					.then(orders => {
						res.render('shop/orders', {
							path: '/orders',
							pageTitle: 'Your Orders',
							orders: orders
						});
					})
					.catch(err => {
						const error = new Error(err);
						error.httpStatusCode = 500;
						return next(error);
					});
			}
		}, 1000);
}

exports.getOrders = (req, res, next) => {
	if(req.user.email === process.env.ADMIN_EMAIL ) {
		Order.find().sort({'isDone': 1})
			.then(orders => {
				res.render('shop/orders', {
					path: '/orders',
					pageTitle: 'Your Orders',
					orders: orders
				});
			})
			.catch(err => {
				const error = new Error(err);
				error.httpStatusCode = 500;
				return next(error);
			});
	}
	else {
		Order.find({ 'user.userId': req.user._id }).sort({'isDone': 1})
			.then(orders => {
				res.render('shop/orders', {
					path: '/orders',
					pageTitle: 'Your Orders',
					orders: orders
				});
			})
			.catch(err => {
				const error = new Error(err);
				error.httpStatusCode = 500;
				return next(error);
			});
	}
};

exports.getInvoice = (req, res, next) => {
	const orderId = req.params.orderId;
	Order.findById(orderId)
		.then(order => {
			if (!order) {
				return next(new Error('No order found.'));
			}
			if (req.user.email !== process.env.ADMIN_EMAIL && order.user.userId.toString() !== req.user._id.toString()) {
				return next(new Error('Unauthorized'));
			}
			const invoiceName = 'invoice-' + orderId + '.pdf';
			const invoicePath = path.join('data', 'invoices', invoiceName);

			const pdfDoc = new PDFDocument();
			res.setHeader('Content-Type', 'application/pdf');
			res.setHeader(
				'Content-Disposition',
				'inline; filename="' + invoiceName + '"'
			);
			pdfDoc.pipe(fs.createWriteStream(invoicePath));
			pdfDoc.pipe(res);

			pdfDoc.fontSize(26).text('Invoice', {
				underline: true
			});
			pdfDoc.text('-----------------------');
			pdfDoc.fontSize(25).text('CHOCO-DIVINE');
			pdfDoc.text('-----------------------');
			let totalPrice = 0;
			let address = order.address;
			let paymentMode = order.paymentType
			order.products.forEach(prod => {
				totalPrice += prod.quantity * prod.product.price;
				pdfDoc
					.fontSize(14)
					.text(
						prod.product.title +
							': ' +
							prod.quantity +
							' x ' +
							prod.product.price +
							' Rs. '
					);
			});
			pdfDoc.fontSize(20).text('---');
			pdfDoc.text('Payment Mode: ' + paymentMode);
			pdfDoc.text('Total Price:  Rs. ' + totalPrice);
			pdfDoc.text('---');
			pdfDoc.text('Phone Number: ' + address.number);
			pdfDoc.text('---');
			pdfDoc.text('Address: ' + address.name + ', ' + address.location + ', ' + address.city + ', '+ address.pincode);
			pdfDoc.end();
		})
		.catch(err => next(err));
};
