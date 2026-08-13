import handler from './api/generate.js';

async function test() {
  const req = {
    method: 'POST',
    body: {
      type: 'answer',
      question: 'What is a contract?',
      subject: 'Law',
      marks: '10'
    }
  };
  
  const res = {
    status: function(code) {
      console.log('Status:', code);
      return this;
    },
    json: function(data) {
      console.log('JSON:', data);
    }
  };

  await handler(req, res);
}
test();
