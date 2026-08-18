import { Response } from "express";
import Alert from "../models/Alert";
import User from "../models/User";
import Contact from "../models/Contact";
import { AuthRequest } from "../middleware/authMiddleware";
import mongoose from "mongoose";
import { sendEmail } from "../config/email";

/* ===================================================================
   Haversine distance helper (returns km)
=================================================================== */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ===================================================================
   Email builders
=================================================================== */
const buildSosEmailHtml = (
  userName: string,
  userPhone: string,
  userEmail: string,
  contactName: string,
  latitude: number,
  longitude: number,
  dateTime: string,
  mapsUrl: string,
  source: string = "MANUAL_SOS",
  riskLevel?: string,
  riskScore?: number,
  distressType?: string
): string => {
  const isAI = source === "AI_VOICE";
  const aiBadge = isAI
    ? `<div style="background:#7c3aed;color:#fff;padding:6px 14px;border-radius:20px;display:inline-block;font-size:12px;font-weight:bold;margin-bottom:12px;">🤖 AI VOICE DETECTED</div>`
    : "";
  const aiInfo =
    isAI && riskLevel
      ? `
    <tr>
      <td style="padding:10px 12px; background-color:#f8f9fa; border:1px solid #eeeeee; font-size:14px; color:#555555;">AI Risk Level</td>
      <td style="padding:10px 12px; background-color:#ffffff; border:1px solid #eeeeee; font-size:14px; color:#d90429; font-weight:bold;">${riskLevel} (${riskScore ?? "-"}/100)</td>
    </tr>
    <tr>
      <td style="padding:10px 12px; background-color:#f8f9fa; border:1px solid #eeeeee; font-size:14px; color:#555555;">Detection Type</td>
      <td style="padding:10px 12px; background-color:#ffffff; border:1px solid #eeeeee; font-size:14px; color:#111111; font-weight:bold; text-transform:capitalize;">${distressType ?? "Unknown"}</td>
    </tr>`
      : "";

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Emergency SOS Alert</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f2f2f2; font-family: Arial, Helvetica, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f2f2; padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" style="max-width:600px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
              <tr>
                <td style="background-color:#d90429; padding:24px; text-align:center;">
                  <h1 style="color:#ffffff; margin:0; font-size:24px; letter-spacing:0.5px;">
                    🚨 Emergency SOS Alert
                  </h1>
                  <p style="color:#ffe5e5; margin:8px 0 0; font-size:14px;">
                    SafeHer Emergency Notification System
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:24px;">
                  ${aiBadge}
                  <p style="font-size:15px; color:#333333; margin:0 0 16px;">
                    Dear <strong>${contactName}</strong>,
                  </p>
                  <p style="font-size:15px; color:#333333; margin:0 0 20px; line-height:1.5;">
                    <strong>${userName}</strong> ${isAI ? "has been detected in distress by AI Voice Monitoring and" : "has triggered an SOS emergency alert and"} may need
                    immediate assistance. Please review the details below and act as soon as possible.
                  </p>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom:20px;">
                    <tr>
                      <td style="padding:10px 12px; background-color:#f8f9fa; border:1px solid #eeeeee; font-size:14px; color:#555555; width:40%;">Full Name</td>
                      <td style="padding:10px 12px; background-color:#ffffff; border:1px solid #eeeeee; font-size:14px; color:#111111; font-weight:bold;">${userName}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 12px; background-color:#f8f9fa; border:1px solid #eeeeee; font-size:14px; color:#555555;">Phone Number</td>
                      <td style="padding:10px 12px; background-color:#ffffff; border:1px solid #eeeeee; font-size:14px; color:#111111; font-weight:bold;">${userPhone}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 12px; background-color:#f8f9fa; border:1px solid #eeeeee; font-size:14px; color:#555555;">Email</td>
                      <td style="padding:10px 12px; background-color:#ffffff; border:1px solid #eeeeee; font-size:14px; color:#111111; font-weight:bold;">${userEmail}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 12px; background-color:#f8f9fa; border:1px solid #eeeeee; font-size:14px; color:#555555;">Date &amp; Time</td>
                      <td style="padding:10px 12px; background-color:#ffffff; border:1px solid #eeeeee; font-size:14px; color:#111111; font-weight:bold;">${dateTime}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 12px; background-color:#f8f9fa; border:1px solid #eeeeee; font-size:14px; color:#555555;">Latitude</td>
                      <td style="padding:10px 12px; background-color:#ffffff; border:1px solid #eeeeee; font-size:14px; color:#111111; font-weight:bold;">${latitude}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 12px; background-color:#f8f9fa; border:1px solid #eeeeee; font-size:14px; color:#555555;">Longitude</td>
                      <td style="padding:10px 12px; background-color:#ffffff; border:1px solid #eeeeee; font-size:14px; color:#111111; font-weight:bold;">${longitude}</td>
                    </tr>
                    ${aiInfo}
                  </table>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding:8px 0 24px;">
                        <a
                          href="${mapsUrl}"
                          target="_blank"
                          rel="noreferrer"
                          style="background-color:#d90429; color:#ffffff; text-decoration:none; font-size:16px; font-weight:bold; padding:14px 32px; border-radius:8px; display:inline-block;"
                        >
                          📍 View Live Location
                        </a>
                      </td>
                    </tr>
                  </table>

                  <div style="background-color:#fff4f4; border:1px solid #ffd6d6; border-radius:8px; padding:16px 18px; margin-bottom:8px;">
                    <p style="margin:0 0 10px; font-size:15px; color:#d90429; font-weight:bold;">
                      What you should do now:
                    </p>
                    <ul style="margin:0; padding-left:18px; font-size:14px; color:#333333; line-height:1.6;">
                      <li>Contact ${userName} immediately.</li>
                      <li>Try to reach their location if possible.</li>
                      <li>If you are unable to contact them, notify local police or emergency services right away.</li>
                    </ul>
                  </div>
                </td>
              </tr>

              <tr>
                <td style="background-color:#f8f9fa; padding:16px; text-align:center; border-top:1px solid #eeeeee;">
                  <p style="margin:0; font-size:12px; color:#888888;">
                    This email was automatically generated by SafeHer.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};

const buildVolunteerEmailHtml = (
  distanceKm: number,
  latitude: number,
  longitude: number,
  dateTime: string,
  mapsUrl: string,
  incidentId: string,
  riskLevel: string = "CRITICAL",
  riskScore: number = 0,
  distressType: string = "unknown",
  detectedKeywords: string[] = []
): string => {
  const keywordsHtml =
    detectedKeywords.length > 0
      ? `<tr>
      <td style="padding:10px 12px; background-color:#f8f9fa; border:1px solid #eeeeee; font-size:14px; color:#555555;">Detected Keywords</td>
      <td style="padding:10px 12px; background-color:#ffffff; border:1px solid #eeeeee; font-size:14px; color:#d90429; font-weight:bold;">${detectedKeywords.join(", ")}</td>
    </tr>`
      : "";

  return `
  <!DOCTYPE html>
  <html>
    <head><meta charset="utf-8" /><title>SafeHer Volunteer Alert</title></head>
    <body style="margin:0; padding:0; background-color:#f2f2f2; font-family: Arial, Helvetica, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f2f2; padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" style="max-width:600px; background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.08);">
              <tr>
                <td style="background-color:#7c3aed; padding:24px; text-align:center;">
                  <h1 style="color:#ffffff; margin:0; font-size:22px;">🚨 SafeHer Volunteer Emergency Alert</h1>
                  <p style="color:#ede9fe; margin:6px 0 0; font-size:13px;">Immediate Assistance Required Near You</p>
                </td>
              </tr>
              <tr>
                <td style="padding:24px;">
                  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px;margin-bottom:16px;text-align:center;">
                    <div style="font-size:28px;font-weight:bold;color:#d90429;">${riskLevel}</div>
                    <div style="font-size:14px;color:#666;margin-top:4px;">Risk Score: ${riskScore}/100 · Detection: <span style="text-transform:capitalize;">${distressType}</span></div>
                  </div>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom:20px;">
                    <tr>
                      <td style="padding:10px 12px; background-color:#f8f9fa; border:1px solid #eeeeee; font-size:14px; color:#555555; width:40%;">Approximate Distance</td>
                      <td style="padding:10px 12px; background-color:#ffffff; border:1px solid #eeeeee; font-size:14px; color:#111111; font-weight:bold;">${distanceKm.toFixed(1)} km from you</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 12px; background-color:#f8f9fa; border:1px solid #eeeeee; font-size:14px; color:#555555;">Date &amp; Time</td>
                      <td style="padding:10px 12px; background-color:#ffffff; border:1px solid #eeeeee; font-size:14px; color:#111111; font-weight:bold;">${dateTime}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 12px; background-color:#f8f9fa; border:1px solid #eeeeee; font-size:14px; color:#555555;">Incident ID</td>
                      <td style="padding:10px 12px; background-color:#ffffff; border:1px solid #eeeeee; font-size:14px; color:#111111; font-weight:bold;">${incidentId}</td>
                    </tr>
                    ${keywordsHtml}
                  </table>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding:8px 0 20px;">
                        <a href="${mapsUrl}" target="_blank" rel="noreferrer"
                          style="background-color:#7c3aed; color:#ffffff; text-decoration:none; font-size:15px; font-weight:bold; padding:14px 32px; border-radius:8px; display:inline-block;">
                          📍 View Emergency Location
                        </a>
                      </td>
                    </tr>
                  </table>

                  <div style="background-color:#f5f3ff; border:1px solid #ddd6fe; border-radius:8px; padding:14px 18px;">
                    <p style="margin:0 0 8px; font-size:14px; color:#7c3aed; font-weight:bold;">Action Required:</p>
                    <p style="margin:0; font-size:13px; color:#333; line-height:1.6;">
                      Please open the <strong>SafeHer Volunteer Dashboard</strong> to view full details and respond to this incident. Your prompt response could save a life.
                    </p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background-color:#f8f9fa; padding:14px; text-align:center; border-top:1px solid #eeeeee;">
                  <p style="margin:0; font-size:11px; color:#888888;">
                    This alert was automatically generated by SafeHer AI Safety System. Do not reply to this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};

/* ===================================================================
   Shared internal helper: notify contacts + nearby volunteers
=================================================================== */
export const notifyContactsAndVolunteers = async (
  userId: string,
  alertId: string,
  latitude: number,
  longitude: number,
  source: string,
  riskLevel?: string,
  riskScore?: number,
  distressType?: string,
  detectedKeywords?: string[]
) => {
  const VOLUNTEER_RADIUS_KM = parseFloat(
    process.env.VOLUNTEER_RADIUS_KM || "5"
  );

  const user = await User.findById(userId);
  if (!user) return;

  const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  const dateTime = new Date().toLocaleString();
  console.log(`\n======================================================`);
  console.log(`🚨 [SOS NOTIFICATION DISPATCH] Source: ${source} | Risk: ${riskLevel ?? "CRITICAL"} (${riskScore ?? 0}/100)`);
  console.log(`User: ${user.name} (${user.email}, ${user.phone}) | Location: (${latitude}, ${longitude})`);
  console.log(`======================================================`);

  // --- Notify emergency contacts ---
  try {
    const trustedContacts = await Contact.find({ user: userId });
    console.log(`👥 Found ${trustedContacts.length} trusted emergency contact(s) for ${user.name}`);

    if (trustedContacts.length === 0) {
      console.warn(`⚠ No emergency contacts registered for ${user.name} (User ID: ${userId}). Go to Emergency Contacts in the dashboard to add contacts.`);
    } else {
      const subject = `🚨 EMERGENCY SOS ALERT - ${user.name} Needs Immediate Help`;
      for (const contact of trustedContacts) {
        try {
          console.log(`📧 Dispatched emergency email to Contact: ${contact.contactName} <${contact.contactEmail}>`);
          const html = buildSosEmailHtml(
            user.name,
            user.phone,
            user.email,
            contact.contactName,
            latitude,
            longitude,
            dateTime,
            mapsUrl,
            source,
            riskLevel,
            riskScore,
            distressType
          );
          await sendEmail({ to: contact.contactEmail, subject, html });
          console.log(`✅ Contact email successfully processed for ${contact.contactEmail}`);
        } catch (emailErr: any) {
          console.error(
            `❌ Failed to send contact email to ${contact.contactEmail}:`,
            emailErr?.message || emailErr
          );
        }
      }
    }
  } catch (contactErr: any) {
    console.error("❌ Error fetching contacts:", contactErr?.message || contactErr);
  }

  // --- Notify nearby volunteers ---
  try {
    const volunteers = await User.find({
      role: "volunteer",
      isBlocked: false,
      lastKnownLatitude: { $exists: true, $ne: null },
      lastKnownLongitude: { $exists: true, $ne: null },
    });

    const nearby = volunteers
      .map((v) => ({
        volunteer: v,
        distanceKm: haversineKm(
          latitude,
          longitude,
          v.lastKnownLatitude!,
          v.lastKnownLongitude!
        ),
      }))
      .filter((x) => x.distanceKm <= VOLUNTEER_RADIUS_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    console.log(
      `📍 Found ${nearby.length} nearby volunteer(s) within ${VOLUNTEER_RADIUS_KM}km`
    );

    if (nearby.length > 0) {
      const volunteerSubject =
        "🚨 SAFEHER EMERGENCY ALERT — Immediate Assistance Required";
      for (const { volunteer, distanceKm } of nearby) {
        try {
          const html = buildVolunteerEmailHtml(
            distanceKm,
            latitude,
            longitude,
            dateTime,
            mapsUrl,
            alertId,
            riskLevel ?? "CRITICAL",
            riskScore ?? 0,
            distressType ?? "unknown",
            detectedKeywords ?? []
          );
          await sendEmail({
            to: volunteer.email,
            subject: volunteerSubject,
            html,
          });
          console.log(
            `✅ Volunteer email sent to ${volunteer.email} (${distanceKm.toFixed(1)}km)`
          );
        } catch (vErr) {
          console.error(
            `❌ Failed to send volunteer email to ${volunteer.email}:`,
            vErr
          );
        }
      }
    } else {
      console.log("⚠ No nearby volunteers with registered location found.");
    }
  } catch (volErr) {
    console.error("❌ Error finding nearby volunteers:", volErr);
  }
};

/* ===================================================================
   createAlert — manual SOS (existing, extended with AI metadata)
=================================================================== */
export const createAlert = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  console.log("========== CREATE ALERT API HIT ==========");

  try {
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    const {
      latitude,
      longitude,
      source,
      riskLevel,
      riskScore,
      distressType,
      confidence,
      detectedKeywords,
    } = req.body;

    if (latitude == null || longitude == null) {
      console.log("❌ Location missing");
      res.status(400).json({ success: false, message: "Location is required" });
      return;
    }

    console.log("Creating Alert...");

    const alert = await Alert.create({
      user: req.user?.id,
      latitude,
      longitude,
      status: "active",
      source: source || "MANUAL_SOS",
      riskLevel: riskLevel || undefined,
      riskScore: riskScore || undefined,
      distressType: distressType || undefined,
      confidence: confidence || undefined,
      detectedKeywords: detectedKeywords || [],
    });

    console.log("✅ ALERT CREATED:", alert._id);

    // Notify contacts + volunteers (fire-and-forget — don't block the response)
    notifyContactsAndVolunteers(
      req.user!.id,
      (alert._id as mongoose.Types.ObjectId).toString(),
      latitude,
      longitude,
      source || "MANUAL_SOS",
      riskLevel,
      riskScore,
      distressType,
      detectedKeywords
    ).catch((err) => console.error("Notification error:", err));

    res.status(201).json({
      success: true,
      message: "SOS Alert created successfully",
      data: alert,
    });
  } catch (error: any) {
    console.error("========== CREATE ALERT ERROR ==========");
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: error?.message || "Server Error" });
  }
};

/* ===================================================================
   getAlertHistory
=================================================================== */
export const getAlertHistory = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const alerts = await Alert.find({ user: req.user?.id }).sort({
      createdAt: -1,
    });
    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ===================================================================
   getActiveAlerts
=================================================================== */
export const getActiveAlerts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const alerts = await Alert.find({ status: { $in: ["active", "accepted"] } })
      .populate("user", "name phone")
      .populate("acceptedBy", "name phone")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ===================================================================
   acceptAlert
=================================================================== */
export const acceptAlert = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const alert = await Alert.findById(id);

    if (!alert) {
      res.status(404).json({ success: false, message: "Alert not found" });
      return;
    }

    alert.status = "accepted";
    alert.acceptedBy = new mongoose.Types.ObjectId(req.user!.id);
    await alert.save();

    res
      .status(200)
      .json({ success: true, message: "Alert accepted successfully", data: alert });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ===================================================================
   resolveAlert
=================================================================== */
export const resolveAlert = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const alert = await Alert.findById(id);

    if (!alert) {
      res.status(404).json({ success: false, message: "Alert not found" });
      return;
    }

    alert.status = "resolved";
    await alert.save();

    res
      .status(200)
      .json({ success: true, message: "Alert resolved successfully", data: alert });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/* ===================================================================
   getAlertById
=================================================================== */
export const getAlertById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const alert = await Alert.findById(id)
      .populate("user", "name phone email")
      .populate("acceptedBy", "name");

    if (!alert) {
      res.status(404).json({ success: false, message: "Alert not found" });
      return;
    }

    res.status(200).json({ success: true, data: alert });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};