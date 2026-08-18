import express from "express";
import { addContact, getContacts,deleteContact,updateContact } from "../controllers/contactController";
import { verifyToken } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", verifyToken, getContacts);
router.post("/", verifyToken, addContact);
router.put("/:id", verifyToken, updateContact);
router.delete("/:id", verifyToken, deleteContact);

export default router;