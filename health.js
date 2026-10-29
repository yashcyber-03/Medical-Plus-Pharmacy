export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    app: "Medical Plus Pharmacy",
    time: new Date().toISOString(),
  });
}
