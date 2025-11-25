import { EventEmitter } from 'events'
import { sendEmail } from '../service/sendEmail.js';

export const eventEmitter = new EventEmitter()

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