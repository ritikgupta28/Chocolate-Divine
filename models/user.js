const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
	email: {
		type: String,
		required: true
	},
	password: {
		type: String,
		require: true
	},
	resetToken: String,
	resetTokenExpiration: Date,
	cart: {
		items: [
			{
				productId: {
					type: Schema.Types.ObjectId,
					ref: 'Product',
					required: true
				},
				quantity: { type: Number, required: true }
			}
		]
	}
});

userSchema.methods.addToCart = function(product, newQuantity) {
	const cartProductIndex = this.cart.items.findIndex(cp => {
		return cp.productId.toString() === product._id.toString();
	});

	const updatedCartItems = [...this.cart.items];

	if(cartProductIndex >= 0) {
		updatedCartItems[cartProductIndex].quantity = newQuantity;
	}
	else {
		updatedCartItems.push({
			productId: product._id,
			quantity: newQuantity
		});
	}
	const updatedCart = {
		items: updatedCartItems
	};
	this.cart = updatedCart;
	return this.save();
};

userSchema.methods.removeFromCart = function(productId) {
	const updatedCartItems = this.cart.items.filter(item => {
		return item.productId.toString() !== productId.toString();
	});
	this.cart.items = updatedCartItems;
	return this.save();
};

userSchema.methods.clearCart = function() {
	this.cart = { items: [] };
	return this.save();
};

module.exports = mongoose.model('User', userSchema);