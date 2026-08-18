import { Response } from "express";
import Contact from "../models/Contact";
import { AuthRequest } from "../middleware/authMiddleware";

export const addContact = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      contactName,
      contactEmail,
      contactPhone,
      relation,
    } = req.body;

    if (
      !contactName ||
      !contactEmail ||
      !contactPhone ||
      !relation
    ) {
      res.status(400).json({
        success: false,
        message: "All fields are required",
      });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const contact = await Contact.create({
      user: req.user.id,
      contactName,
      contactEmail,
      contactPhone,
      relation,
    });

    res.status(201).json({
      success: true,
      message: "Contact added successfully",
      data: contact,
    });
  } catch (error: any) {
    console.error("========== ADD CONTACT ERROR ==========");
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getContacts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const contacts = await Contact.find({
      user: req.user.id,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: contacts,
    });
  } catch (error: any) {
    console.error("========== GET CONTACTS ERROR ==========");
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateContact = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      contactName,
      contactEmail,
      contactPhone,
      relation,
    } = req.body;

    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const contact = await Contact.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.id,
      },
      {
        contactName,
        contactEmail,
        contactPhone,
        relation,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!contact) {
      res.status(404).json({
        success: false,
        message: "Contact not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Contact updated successfully",
      data: contact,
    });
  } catch (error: any) {
    console.error("========== UPDATE CONTACT ERROR ==========");
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteContact = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const contact = await Contact.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!contact) {
      res.status(404).json({
        success: false,
        message: "Contact not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Contact deleted successfully",
    });
  } catch (error: any) {
    console.error("========== DELETE CONTACT ERROR ==========");
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};