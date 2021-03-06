const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const orderSchema = new Schema({
  products: [
    {
      product: { type: Object, required: true },
      quantity: { type: Number, required: true }
    }
  ],
  user: {
    email: {
      type: String,
      required: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    }
  },
  isDone: {
    type: Number,
    default: -1
  },
  paymentType: {
    type: String,
    default: "delivery"
  },
  paymentDone: {
    type: Boolean,
    default: false
  },
  address: {
    name: {
      type: String,
      required: true
    },
    location: {
      type: String,
      required: true
    },
    number: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    pincode: {
      type: String,
      required: true
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
