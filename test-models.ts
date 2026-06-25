import * as dotenv from 'dotenv'; dotenv.config(); fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GEMINI_API_KEY).then(res = 
