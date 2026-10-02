# AI-political-Poster
It is an internship project for Rise Together.

Docs: [knowledge/architecture.md](knowledge/architecture.md) (developers) · [user-manual/](user-manual/) (users).

## Run locally
Needs Node 20+ and a MongoDB Atlas connection string.

```bash
# server — http://localhost:5000
cd server
npm install
cp .env.example .env   # fill in MONGODB_URI
npm run dev            # check http://localhost:5000/api/health

# client — http://localhost:3000 (second terminal)
cd client
npm install
npm run dev
```
