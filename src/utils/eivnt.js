import { EventEmitter } from 'events'
import { sendEmail } from '../service/sendEmail.js';
import { getSocketInstance } from '../socket/socket.js';

export const eventEmitter = new EventEmitter()

// for send email
eventEmitter.on('userCreated', ({ otp, email }) => {
    sendEmail({
        to: email,
        subject: 'confirm your email',
        html: `<h1>${otp}</h1>`
    })
});
eventEmitter.on('forgotPassword', ({ otp, email }) => {
    sendEmail({
        to: email,
        subject: 'reset your password',
        html: `<h1>${otp}</h1>`
    })
});

// sockets
eventEmitter.on('emitToRestaurant', ((restaurantId, event, payload) => {
    const io = getSocketInstance();
    if (!io) return;
    io.to(`restaurant_${restaurantId}`).emit(event, payload);
}));
eventEmitter.on('emitToOrder', (orderId, event, payload) => {
    const io = getSocketInstance();
    if (!io) return;
    io.to(`order_${orderId}`).emit(event, payload);
});