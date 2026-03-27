import express from "express";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send(`
    <h1>FlipFlow AI is Live 🚀</h1>
    <p>Your app is running.</p>
    <p>Next step: connect frontend UI.</p>
  `);
});

app.post("/analyze", async (req, res) => {
  res.json({
    message: "AI endpoint working",
    data: req.body
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

