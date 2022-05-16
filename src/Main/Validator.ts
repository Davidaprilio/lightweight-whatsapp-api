import { check, validationResult, ValidationChain } from "express-validator";
import { Request, Response, NextFunction } from "express";
import clientSession from "./SessionClient";
import Device from "../models/Device";

/**
 * run express Validation
 */
export const validate = (validations: any[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(
      validations.map((validation: any) => validation.run(req))
    );

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      status: false,
      message: "Bad Request",
      errors: errors.array(),
    });
    return;
  };
};

export const validateUseClient = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  await check("cid").not().isEmpty().run(req);
  const errResult = validationResult(req);
  if (!errResult.isEmpty()) {
    return res.status(400).json({
      status: false,
      error: "Bad Request",
      message: "cid required",
    });
  }

  const device = await Device.findOne({ cid: req.body.cid });
  if (!device) {
    return res.status(404).json({
      status: false,
      message: "Not Found",
      errors: "Device Not Found",
    });
  }
  next();
};

export const validateClientConnect = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (clientSession[req.body.cid] === undefined) {
    return res.status(403).json({
      status: false,
      message: "Bad Request",
      errors: "Device Not Connected",
    });
  }
  next();
};

export const validatePhone = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  await check("phone")
    .not()
    .isEmpty()
    .withMessage("Phone Required")
    .isString()
    .withMessage("phone must by of type 'String'")
    .run(req);
  const errResult = validationResult(req);
  if (errResult.isEmpty()) {
    const check = await clientSession[req.body.cid].isRegistWA(req.body.phone);
    if (!check) {
      // jika tidak terdaftar
      res.status(200).json({
        status: true,
        message: "OK",
        data: {
          sent: false,
          status: 0,
          message: "Not Register",
          phone: req.body.phone,
        },
      });
      return;
    }
    next();
  } else {
    res.status(400).json({
      status: false,
      message: "Bad Request",
      errors: errResult,
    });
    return;
  }
};
