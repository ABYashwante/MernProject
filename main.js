require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');



const app = express();
const PORT = 4000;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/mydatabase', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Create a schema for the form data
const formDataSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    message: String,

    tokens:[{
        token:{
            type:String,
            required:true
        }
    }]
});

// MIDDLEWARE TO GENERATE TOKEN
formDataSchema.methods.generateAuthToken = async function(){
    try {
        const token = jwt.sign({_id:this._id.toString()}, process.env.SECRET_KEY);
        this.tokens = this.tokens.concat({token:token});
        return token;
    } catch (error) {
        res.send(error);
        console.log(error);
    }
}

// MIDDLEWARE FOR HASHING PASSWORD
formDataSchema.pre("save", async function(next){
    if(this.isModified("password")){
        console.log("password: "+ this.password);
        this.password = await bcrypt.hash(this.password, 10);
        console.log("hash password: " + this.password);
    }
     next();
});

// Create a model/ Collection based on the schema
const FormData = mongoose.model('FormData', formDataSchema);

// Middleware to parse incoming request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Registration
app.post('/register', async (req, res) => {
    const { name, email, password, message } = req.body;

    try {
        // Create a new FormData document
        const formData = new FormData({
            name: name,
            email: email,
            password: password,
            message: message
        });

        // Generate a token before saving the document to the DB
        const token = await formData.generateAuthToken();
        console.log("register token: "+ token);

        // Save the document to the database
        await formData.save();
        
        // Redirect to the login page after successful form submission
        res.redirect('/login.html');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error submitting form');
    }
});


// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find the user in the database based on the email
        const user = await FormData.findOne({ email: email });

        const isMatch = await bcrypt.compare(password, user.password);

        const token = await user.generateAuthToken();
        console.log("login token: "+ token);

        // If user not found or password is incorrect, send an error message
        if (isMatch) {
            res.status(201).redirect('/logout.html');
        
        }
        else    return res.status(401).send('Incorrect email or password');
        // If email and password are correct, send a success message
        
    } catch (err) {
        console.error(err);
        res.status(500).send('Invalid details');
    }
});

//Logout
// app.post('/logout', async (req, res) => {
//     // Perform logout operations (e.g., destroy session, clear cookies)
//     // Redirect to the registration page
//     res.redirect('/index.html');
// });



// Start the server
app.listen(PORT, () => {
    console.log("Server is running on port", PORT);
});



// Run your Express server (node app.js) and open your form in a browser http://localhost:4000 . When you submit the form, the form data should be saved to MongoDB.