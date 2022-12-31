const express = require('express')
const app = express();
const mongodb = require('mongodb');
const mongoclient = mongodb.MongoClient;
const dotenv = require("dotenv").config()
const URL = process.env.DB
const bcrypt = require('bcrypt')
const nodemailer = require("nodemailer");
const crypto = require("crypto")
const PORT = 3000;

app.use(express.json())

const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: "d73330670@gmail.com",
        pass: "fxploecdfmhtiyaa"
    }
})

app.post("/register", async (req, res) => {
    try {
        const connection = await mongoclient.connect(URL);
        const db = connection.db("passwordresetflow");
        const salt = await bcrypt.genSalt(10)
        const hash = await bcrypt.hash(req.body.password, salt)
        req.body.password = hash
        const user = await db.collection("users").insertOne(req.body)
        await connection.close()
        res.json({ message: "user created" })
    } catch (error) {
        console.log(error)
    }
})

app.post('/forgotpassword', async function (req, res) {
    try {
        const connection = await mongoclient.connect(URL)
        const db = await connection.db("passwordresetflow")
        const user = await db.collection("users").findOne({ email: req.body.email })
        if (user) {
            const randomUrl = crypto.randomBytes(16).toString('hex')
            const mailOptions = {
                from: "d73330670@gmail.com",
                to: user.email,
                subject: "Reset your password",
                html: `<p>Click <a href="http://localhost:3000/reset-password?url=${randomUrl}">here</a> to reset your password.</p>`
            }
            console.log(mailOptions.html)
            await db.collection("users").updateOne({ _id: user._id }, { $set: { token: randomUrl } })
            await connection.close()
            res.json({ message: "Email sent", token: randomUrl })
            transport.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log(error)
                } else {
                    console.log(`Email sent: ${info.response}`)
                }
            })
        } else {
            res.json({ message: "Email address not valid" })
        }
    } catch (error) {
        console.log(error)
    }
})

app.get('/reset-password', async (req, res) => {
    try {
        const connection = await mongoclient.connect(URL)
        const db = await connection.db("passwordresetflow")
        const user = await db.collection("users").findOne({ token: req.query.url });
        if (user.token == req.query.url) {
            res.redirect(`http://localhost:3001/reset-password-page?id=${user._id}`)
        } await connection.close()
    } catch (error) {
        console.log(error)
        res.json("Invalid url")
    }
});

app.post('/reset-password-page', async (req, res) => {
    try {
        const userid = req.query.id;
        const connection = await mongoclient.connect(URL)
        const db = await connection.db("passwordresetflow")
        const salt = await bcrypt.genSalt(10)   
        const hash = await bcrypt.hash(req.body.password, salt)
        req.body.password = hash
        await db.collection("users").updateOne({ _id: mongodb.ObjectId(userid) }, { $set: { password: req.body.password } })
        await connection.close()
        res.json({ message: "Password has been reset" })
    } catch (error) {
        console.log(error)
    }
})

app.listen(PORT, () => console.log("Server is running at port " + PORT));