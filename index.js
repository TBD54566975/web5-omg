const express = require('express')
const app = express()
const port = 3000
const fs = require('fs');


app.use(express.json())
const appjs = fs.readFileSync('seed_app.html', 'utf8');

app.get('/', (_, res) => { res.send(fs.readFileSync('index.html', 'utf8'));  });
app.get('/component-builder', (_, res) => {  res.send(fs.readFileSync('component-builder.html', 'utf8'));  });
app.get("/app", (_, res) => { res.send(appjs); });

app.post('/prompt', async (req, res) => {
  // read the body of the request - which is json
  body = req.body;
  const result = await processOpenai(body.prompt, body.context_html);  
  res.send(result);
});

app.post("/generate-webcomponent", async (req, res) => {
  const result = await generateWebElement(req.body.schema);
  return res.send(result);
});

app.post("/identify-best-fit-schema", async (req, res) => {
  const result = await identifyBestFitSchema(req.body.schema_description);
  return res.send(result);
});

app.listen(port, async () => {
  console.log(`web5 maker app listening on port ${port}`)
})

app.use(function(err,req,res,next){
  console.log(err);
  res.status(500).send('Something broke!');
});


process.on('unhandledRejection', (reason, promise) => {
  console.error(`Unhandled promise rejection. Reason: ${reason}. Promise: ${JSON.stringify(promise)}`);
});

process.on('uncaughtException', err => {
  console.error('Uncaught exception:', (err.stack || err));
});


async function processOpenai(prompt, context_html) {
  console.log("processing prompt: " + prompt);
  const { Configuration, OpenAIApi } = require("openai");
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });

  let chat_messages = [
    {role: "system", "content": "You are a helpful assistant that modifies the html and web5 source code as directed."},              
  ];


  if (context_html == appjs) {

    // append to chat_messages as it is brand new
    chat_messages = chat_messages.concat([
      {role: "user", content: "Following is a sample of a web5 application in a single html file. It doesn't really do much yet, but shows a load and save code sample. You can use this as a basis to build a simple single page html application as directed (and you don't need to include the sample load and save). Please return only the source code.\n Web5 app:\n" + context_html + "\n" + prompt},
      ]);

  } else {
    chat_messages = chat_messages.concat([
      {role: "user", content: "Following is a work in progress web5 application in a single html file. Modify this as directed. Please return only the source code.\n Web5 app:\n" + context_html + "\n" + prompt},
      ]);
    
  }

  chat_messages = chat_messages.concat([
    
  ]);


  const openai = new OpenAIApi(configuration);  
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: chat_messages,
  });
  console.log(completion.data.choices[0].message);
  
  const result  = completion.data.choices[0].message['content'];

  // get only the content that starts with <!DOCTYPE html> and ends with </html>
  const start = result.indexOf("<!DOCTYPE html>");
  const end = result.indexOf("</html>");
  const html = result.substring(start, end + "</html>".length);
  return html;
  
  
}





async function identifyBestFitSchema(prompt) {
  const { Configuration, OpenAIApi } = require("openai");
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });

  let chat_messages = [
    {role: "system", "content": "You are a helpful assistant that will match try to match the data or description to a schema from schema.org."},              
    {role: "user", content: "schema.org defines many json schemas. Try to match the following description to a schema from schema.org that fits, and return only the schema URL."},
    {role: "assistant", content: "ok. understood. Can you provide an examples?"},
    {role: "user", content: "Description: " + " I want to track a healh insurance plan"},
    {role: "assistant", content: "https://schema.org/HealthInsurancePlan"},
    {role: "user", content: "Description: " + prompt},
    ]

  const openai = new OpenAIApi(configuration);  
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: chat_messages,
  });
  console.log(completion.data.choices[0].message);
  
  const result  = completion.data.choices[0].message['content'];

  return result;
  
  
}


async function generateWebElement(schema) {
  const { Configuration, OpenAIApi } = require("openai");
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });

  let chat_messages = [
    {role: "system", "content": "You are a helpful assistant that build a web component for the given JSON schema."},              
    {role: "user", content: "Based on https://html.spec.whatwg.org/multipage/custom-elements.html#custom-elements, write a web component that renders json that complies with a specified schema. Please only return just the code, including how to register and use it. Doesn't need to be a whole HTML page with it (and no styles are needed). Some schemas can be long, so it may be necessary to only show rendering a subset of the fields for brevity and speed." },
    {role: "assistant", content: "ok. understood. If needed I will only show a subset of fields to not be too slow (and only show the code, no comments). Can you show me an example?"},
    {role: "user", content: "JSON schema: https://schema.org/Person"},
    {role: "assistant", content: `
    class PersonComponent extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: 'open' });
      }
    
      connectedCallback() {
        this.render();
      }
    
      render() {
        const personData = JSON.parse(this.getAttribute('data'));
        const name = personData.givenName || '';
        const email = personData.email || '';
        const telephone = personData.telephone || '';
    
        this.shadowRoot.innerHTML = \`
          <div>
            <h2>Given Name: \${givenName}</h2>
            <p>Email: \${email}</p>
            <p>Telephone: \${telephone}</p>
          </div>
        \`;
      }
    }
    
    customElements.define('person-component', PersonComponent);
    `},
    {role: "user", content: "JSON schema: " + schema},


    ]

  const openai = new OpenAIApi(configuration);  
  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: chat_messages,
  });
  console.log(completion.data.choices[0].message);
  
  const result  = completion.data.choices[0].message['content'];
  // strip any markdown nonsense
  return result.replace(/`/g, '');
  
  
  
}

//generateDataForSchema("https://schema.org/HealthInsurancePlan");
//generateWebElement("I'm building an app for car models");


