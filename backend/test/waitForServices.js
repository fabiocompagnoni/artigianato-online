import request from 'supertest';

async function waitForService(url, app, timeout = 5000, interval = 1000) {
  const endTime = Date.now() + timeout;
  
  while (Date.now() < endTime) {
    try {
      const res = await request(app).get('/' + url);
      if (res.body.status === 'ok') return;
    } catch (error) {
      //console.log(`Error for url ${url}: ${error}`);
    }
    
    // Attendi un po' prima di riprovare
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Service at ${url} did not become ready in time`);
}

export default async function beforeAllCallback(app) {
    await Promise.all([
        waitForService('users', app),
        waitForService('images', app),
        waitForService('products/status', app),
        waitForService('purchases', app),
        waitForService('tickets', app),
    ]);
};