const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator/check');

const PDFDocument = require('pdfkit');
const stripe = require('stripe')('pk_test_h2tgqWZsF19xCvnJ7hQSveem00G5DfgOtO');

const Product = require('../models/product');
const Order = require('../models/order');

const ITEMS_PER_PAGE = 4;

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

// exports.getProduct = (req, res, next) => {
// 	const prodId = req.params.productId;
// 	Product.findById(prodId)
// 		.then(product => {
// 			res.render('shop/product-detail', {
// 				product: product,
// 				pageTitle: product.title,
// 				path: '/products'
// 			});
// 		})
// 		.catch(err => {
// 			const error = new Error(err);
// 			error.httpStatusCode = 500;
// 			return next(error);
// 		});
// };

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

exports.postOrderMark = (req, res, next) => {
	const orderId = req.params.orderId;
	Order.findById(orderId)
	.then(order => {
		order.isDone = true;
		return order.save();
	})
	.catch(err => {
		  const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
	});
	setTimeout(() => {
	if(req.user.email === 'ritik@ritik.com') {
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

exports.postOrder = (req, res, next) => {
	// const token = req.body.stripeToken;
	const name = req.body.naam;
	const location = req.body.location;
	const number = req.body.nmbr;
	const city = req.body.city;
	const pincode = req.body.pincode;
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
			// const charge = stripe.charges.create({
			// 	amount: totalSum * 100,
			// 	currency: 'usd',
			// 	description: 'Demo Order',
			// 	source: token,
			// 	metadata: { order_id: result._id.toString() }
			// });
			return req.user.clearCart();
		})
		.then(() => {
			res.redirect('/orders');
		})
		.catch(err => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.getOrders = (req, res, next) => {
	if(req.user.email === 'ritik@ritik.com') {
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
			if (req.user.email !== 'ritik@ritik.com' && order.user.userId.toString() !== req.user._id.toString()) {
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
			let totalPrice = 0;
			let address = order.address;
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
			pdfDoc.text('Total Price:  Rs. ' + totalPrice);
			pdfDoc.text('---');
			pdfDoc.text('Phone Number: ' + address.number);
			pdfDoc.text('---');
			pdfDoc.text('Address: ' + address.name + ', ' + address.location + ', ' + address.city + ', '+ address.pincode);

			pdfDoc.end();
		})
		.catch(err => next(err));
};
