const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('supabase/supabase-js');

const router = express.Router;

// initialize supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY

);
// ========================
// register route 
// ========================

router.post('/register', async (req, res) => {
    try{
        const {email, password, username} = req.body;

        // check if true lahat ng fields
        if (!email || !password || !username){
            return res.status(400).json({
                error: 'Please provide email, password, username'
            });
        }

        //validate password, minimum of 8 characters
        if (password.length < 8){
            return res.status(400).json({
                error: 'Password must be at least 8 characters'
            });
        }

        //check if user exists
        const {data: existingUser} = await supabase
        .from('users')
        .select('id')
        .or(`email.eq.{email}, username.eq.{username}`) // back ticks kapag gumagamait ng brackets
        .single();
        
        // select from users where email = email na receive OR username = username na receive na expecting at most 1 row

        if (existingUser){
            return res.status(400).json({ 
                error: 'Email or username already exists' 
            });
        }
        
        // dito na hashing password using bcrypt.js
        // yung bcrypt siya yung pwedeng mag translate ng hashed pass sa input kapag logging in na
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const {data: newUser, error} = await supabase
        .from('users')
        .insert([
            {
                email,
                password,
                password_hash: passwordHash
            }
        ])
        .select()
        .single()

        if (error) {
            throw error;
        }

        //JWT Token na
        
    }
    catch
    
});