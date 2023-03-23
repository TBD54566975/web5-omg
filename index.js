const express = require('express')
const app = express()
const port = 3000
const fs = require('fs');


app.use(express.json())

const appjs = fs.readFileSync('seed_app.html', 'utf8');


app.get('/', (req, res) => {
  // load index.html as a string, and serve it
  const index = fs.readFileSync('index.html', 'utf8');
  res.send(index);
  
});

app.get("/app", (req, res) => {
  // load seed.js as a string, and serve it. this is the starting point for the app that they will be editing.
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

  let chat_messages = [
    {role: "system", "content": "You are a helpful assistant that modifies the html and web5 source code as directed."},              

    {role: "user", content: "Some requirements: when a script tag of type 'module' is used, make sure functions are made accessible via window.functionName = functionName, or use the document object to attach onclick handlers to form elements."},
    {role: "assistant", content: "ok understood."},

    {role: "user", content: "write a minimal html page which shows pictures of lions"},
    {role: "assistant", content : `<!DOCTYPE html>
    <html>
      <body>
        <h1>Lions</h1>
        <img src="lion1.jpg" alt="lion">
        <img src="lion2.jpg" alt="lion">
      </body>
    </html>`},

    {role: "user", content: "write an app that prints an alert with a random number when I press a button"},
    {role: "assistant", content : `<!DOCTYPE html>
    <html>
      <head>
        <title>Random Number Generator</title>
      </head>
      <body>
        <h1>Random Number Generator</h1>
        <button onclick="generateRandomNumber()">Generate Random Number</button>
        <script type="module">
          window.generateRandomNumber = function generateRandomNumber() {
            var randomNumber = Math.floor(Math.random() * 100) + 1;
            alert("Your random number is: " + randomNumber);
          }
        </script>
      </body>
    </html>`},


    ];


  if (context_html == appjs) {

    // append to chat_messages: 
    chat_messages = chat_messages.concat([
      {role: "user", content: "Web5 is a new decentralized framework for building web apps. I will provide you with the web5 web app source code and you will modify it as directed."},
      {role: "assistant", content: "ok. I will modify the code as directed and only return the code. What does web5 look like, can you provide me a minimal example?"},  
      {role: "user", content: "The following is a minimal example of a web5 app that show the the style of the api and necessary boiler plate in the context of a single html page:\n" + context_html},              
      {role: "assistant", content: "ok got it. I will base code on the provided example, and not add any unnecessary styles unless asked. I also note this is a single page app with no server side."},
      {role: "user", content: "Build a web5 based on the example previously, as a single page app (no server to submit to) in the browser:" + prompt},          
      ]);

  } else {
    // append to chat_messages: 
    chat_messages = chat_messages.concat([
      {role: "user", content: "Web5 is a new decentralized framework for building web apps. I will provide you with the web5 web app source code and you will modify it as directed, preserving styles and boilerplate."},
      {role: "assistant", content: "ok. I will modify the code as directed and only return the code."},  
      {role: "user", content: prompt + ":\n" + context_html},
    ]);
  }

  const openai = new OpenAIApi(configuration);  
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: chat_messages,
  });
  console.log(completion.data.choices[0].message);
  
  console.log(completion);  
  const result  = completion.data.choices[0].message['content'];

  // get only the content that starts with <!DOCTYPE html> and ends with </html>
  const start = result.indexOf("<!DOCTYPE html>");
  const end = result.indexOf("</html>");
  const html = result.substring(start, end + "</html>".length);
  console.log(html);
  return html;
  
  
}

//processOpenai("how are you today?", "<html><body><h1>hello world</h1></body></html>")
