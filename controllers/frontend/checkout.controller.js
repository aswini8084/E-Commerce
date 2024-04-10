const stripe = require('stripe')("sk_test_51OpU8USDJSdw56GOJHCVK7XoJojwI9IsM85A6Z7unRUkeJ2vcO8CBnr2AS1lwTQo8xWN7gqOntNHAs6X8SuRIksd00dp5EVWkY")
const cartModel = require("../../models/cart.model");
const cartItemModel = require("../../models/cartItem.model");
const orderModel = require("../../models/order.model");
const orderItemModel = require("../../models/orderItem.model");
const { 
    v4: uuidv4 
} = require('uuid');


const checkout = async (req, res) => {
    try {
        let cart = await cartModel.findOne({
            _id: req.params.cartId
        })

        if (cart) {
            let order = await orderModel.create({
                cart: req.params.cartId,
                user: cart.user,
                address: {
                    name: req.body.name,
                    email: req.body.email,
                    address: req.body.address,
                    city: req.body.city,
                    state: req.body.state,
                    country: req.body.country,
                    zipCode: req.body.zipCode,
                    contact: req.body.contact,
                },
                subTotal: cart.subTotal,
                tax: cart.tax,
                grandTotal: cart.grandTotal
            })

            let cartItems = await cartItemModel.find({
                cartId: cart._id,
            })

            for (const item of cartItems) {
                await orderItemModel.create({
                    product: item.product,
                    order: order._id,
                    qty: item.qty,
                })
            }

            await cartModel.updateOne({ _id: cart._id }, {
                orderPlaced: true
            })

            return res.json({
                status: 200,
                message: "Order Placed",
            })
        } else {
            return res.json({
                status: 404,
                message: "Cart not found",
            })
        }

    } catch (error) {
        return res.json({
            status: 500,
            message: error.message,
        })
    }
}
const stripePayment = (req, res) => {
    const { token, amount } = req.body;
    const idempotencyKey = uuidv4();

    stripe.customers.create({
        email: token.email,
        source: token.id
    }).then(customer => {
        return stripe.charges.create({
            amount: amount * 100,
            currency: 'INR',
            customer: customer.id,
            receipt_email: token.email
        }, {
            idempotencyKey: idempotencyKey // Pass idempotencyKey as an option
        });
    }).then(result => {
        res.status(200).json(result);
    }).catch(err => {
        res.status(500).json({ error: err.message }); // Return an error message
    });
};



module.exports = {
    checkout,
    stripePayment
}