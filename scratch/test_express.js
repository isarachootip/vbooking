import express from 'express';

const app = express();

const router = express.Router();
router.put('/:id', (req, res) => res.send('PUT /:id'));
router.get('/:id/followups', (req, res) => res.send('GET /:id/followups'));
router.post('/:id/followups', (req, res) => res.send('POST /:id/followups'));

app.use('/api/leads', router);

app.post('/api/leads/:id/convert', (req, res) => {
    res.send('POST /api/leads/:id/convert HIT!');
});

app.listen(3001, async () => {
    console.log('Server started');
    try {
        const res = await fetch('http://localhost:3001/api/leads/lead_123/convert', { method: 'POST' });
        const text = await res.text();
        console.log('Response:', text);
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
});
