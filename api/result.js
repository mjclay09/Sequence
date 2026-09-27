// GET    /api/result?id=...  -> the saved result for a private link (no email or address returned)
// DELETE /api/result?id=...  -> deletes it ("Delete my results")
import { dbReady, ID_RE, getResult, deleteResult } from './_db.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  const id = String(req.query?.id || '');
  if (!ID_RE.test(id)) return res.status(404).json({ error: 'Not found' });
  if (!dbReady()) return res.status(503).json({ error: 'Saved results are not set up yet' });
  try {
    if (req.method === 'GET') {
      const row = await getResult(id);
      if (!row) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ id: row.id, created_at: row.created_at, name: String(row.name || '').split(' ')[0], goal: row.goal, answers: row.answers });
    }
    if (req.method === 'DELETE') {
      await deleteResult(id);
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Result lookup failed', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
