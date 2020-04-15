import { Request, Response, NextFunction } from 'express'
export function verifyReq(req: Request, res: Response, next: NextFunction) {
  // Check if the req from PageFly server or not
  const { secretKey } = req.query
  const { SERVER_SECRET } = process.env

  if (!secretKey) {
    res.json({ success: 0, message: "Missing Secret Key!" })
  } else if (secretKey !== SERVER_SECRET) {
    res.json({ success: 0, message: "Invalid Secret Key!" })
  } else {
    next()
  }
}