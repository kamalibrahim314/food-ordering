import nodemailer from 'nodemailer';

export const sendEmail = async (mailOptions) => {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL, // generated ethereal user
            pass: process.env.PASSWORD, // generated ethereal password
        },
    });

    (async () => {
        // send mail with defined transport object
        let info = await transporter.sendMail({
            from: `foodOrdring app 👻 <${process.env.EMAIL}>`,
            ...mailOptions
        });
    })();
}