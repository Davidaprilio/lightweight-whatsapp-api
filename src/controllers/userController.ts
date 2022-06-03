import { Request, Response } from "express";

exports.dashboard = async (req: Request, res: Response) => {
  // get all device
  res.render("index");
};
