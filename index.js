const express = require('express')
const app = express()
const port = 3000
const fs = require('fs');


app.use(express.json())

app.get('/', (req, res) => {
  // load index.html as a string, and serve it
  const index = fs.readFileSync('index.html', 'utf8');
  res.send(index);
  
});

app.get("/app", (req, res) => {
  // load seed.js as a string, and serve it. this is the starting point for the app that they will be editing.
  const appjs = fs.readFileSync('seed_app.html', 'utf8');
  res.send(appjs);
});


app.post('/prompt', async (req, res) => {
  // read the body of the request - which is json
  body = req.body;
  const result = await processOpenai(body.prompt, body.context_html);
  res.send(result);
});


app.listen(port, async () => {
  console.log(`web5 maker app listening on port ${port}`)
})


async function processOpenai(prompt, context_html) {
  console.log("processing prompt: " + prompt);
  const { Configuration, OpenAIApi } = require("openai");
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const appjs = fs.readFileSync('seed_app.html', 'utf8');

  const openai = new OpenAIApi(configuration);  
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
              {role: "system", "content": "You are a helpful assistant that modifies the html and web5 source code as directed."},
              {role: "user", content: "web5 is a new decentralised framework for building web apps. Take a code snippet and modify it to add a new feature, returning only the code."},
              {role: "assistant", content: "ok. I will modify the code as directed and only return the code. What does web5 look like, can you provide me a minimal example?"},
              {role: "user", content: "Following is a minimal example of a web5 app that show the the style of the api and necessary boiler place in the contest of a single html page:\n" + appjs},
              {role: "assistant", content: "ok got it. Now you can show me the single html page app in web5 you want me to modify."},
              {role: "user", content: context_html},
              {role: "assistant", content: "ok describe what you want me to do with this code."},
              {role: "user", content: prompt},          

              ],
  });
  console.log(completion.data.choices[0].message);
  
    
  const result  = completion.data.choices[0].message['content'];

  // get only the content that starts with <!DOCTYPE html> and ends with </html>
  const start = result.indexOf("<!DOCTYPE html>");
  const end = result.indexOf("</html>");
  const html = result.substring(start, end + "</html>".length);
  console.log(html);
  return html;
  
  
}
