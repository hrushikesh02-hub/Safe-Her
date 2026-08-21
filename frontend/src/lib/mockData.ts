export const stats = {
  registeredUsers: 48230,
  emergencyAlerts: 12849,
  activeVolunteers: 3204,
  successRate: 98.6,
};

export const recentActivity = [
  { id: "A-1029", action: "SOS Resolved", time: "2h ago", location: "MG Road, Bengaluru", status: "resolved" },
  { id: "A-1028", action: "Volunteer Dispatched", time: "5h ago", location: "Sector 18, Noida", status: "active" },
  { id: "A-1027", action: "Safe zone added", time: "1d ago", location: "Andheri West", status: "info" },
  { id: "A-1026", action: "Contact verified", time: "2d ago", location: "Profile", status: "info" },
];

export const emergencyContacts = [
  { id: 1, name: "Priya Sharma", phone: "+91 98201 23456", relation: "Sister" },
  { id: 2, name: "Rajesh Verma", phone: "+91 99102 88765", relation: "Father" },
  { id: 3, name: "Anita Desai", phone: "+91 91020 45612", relation: "Best Friend" },
];

export const nearbyResponders = [
  { id: "V-201", name: "Meera Kapoor", distance: "0.4 km", status: "available", rating: 4.9 },
  { id: "V-202", name: "Aisha Khan", distance: "0.8 km", status: "available", rating: 4.8 },
  { id: "V-203", name: "Neha Joshi", distance: "1.2 km", status: "on-duty", rating: 4.7 },
  { id: "V-204", name: "Ritu Singh", distance: "1.7 km", status: "available", rating: 4.9 },
];

export const safeZones = [
  { id: 1, name: "City General Hospital", type: "Hospital", distance: "0.6 km", address: "MG Road" },
  { id: 2, name: "Central Police Station", type: "Police", distance: "0.9 km", address: "Brigade Rd" },
  { id: 3, name: "Sakhi One-Stop Center", type: "Help Center", distance: "1.4 km", address: "Indiranagar" },
  { id: 4, name: "Community Safe Shelter", type: "Shelter", distance: "2.1 km", address: "HSR Layout" },
];

export const alertHistory = [
  { id: "A-1029", date: "2026-06-06", location: "MG Road", status: "Resolved", volunteer: "Meera Kapoor" },
  { id: "A-1028", date: "2026-06-05", location: "Sector 18", status: "Resolved", volunteer: "Aisha Khan" },
  { id: "A-1024", date: "2026-06-03", location: "Andheri", status: "Pending", volunteer: "—" },
  { id: "A-1021", date: "2026-05-29", location: "Salt Lake", status: "Active", volunteer: "Neha Joshi" },
];

export const incomingAlerts = [
  { id: "A-3001", user: "Ananya R.", distance: "0.6 km", time: "Just now", priority: "high" },
  { id: "A-3002", user: "Kavya S.", distance: "1.1 km", time: "2 min ago", priority: "high" },
  { id: "A-3003", user: "Riya M.", distance: "1.9 km", time: "6 min ago", priority: "medium" },
];

export const adminUsers = [
  { id: "U-1001", name: "Sneha Patil", email: "sneha@example.com", status: "Active", joined: "2025-12-04" },
  { id: "U-1002", name: "Divya Nair", email: "divya@example.com", status: "Active", joined: "2026-01-18" },
  { id: "U-1003", name: "Pooja Mehta", email: "pooja@example.com", status: "Suspended", joined: "2026-02-22" },
  { id: "U-1004", name: "Ishita Roy", email: "ishita@example.com", status: "Active", joined: "2026-03-10" },
];

export const pendingVolunteers = [
  { id: "V-501", name: "Tanvi Kulkarni", city: "Pune", submitted: "2026-06-01" },
  { id: "V-502", name: "Maya Iyer", city: "Chennai", submitted: "2026-06-03" },
  { id: "V-503", name: "Zara Ahmed", city: "Hyderabad", submitted: "2026-06-04" },
];

export const monthlyAlerts = [
  { m: "Jan", v: 820 }, { m: "Feb", v: 940 }, { m: "Mar", v: 1120 },
  { m: "Apr", v: 980 }, { m: "May", v: 1340 }, { m: "Jun", v: 1480 },
];

export const recentAlerts = [
  {
    id: "SOS-2401",
    name: "Priya Sharma",
    location: "MG Road, Pune",
    severity: "Critical",
    time: "2 min ago",
  },
  {
    id: "SOS-2402",
    name: "Ananya Gupta",
    location: "FC Road, Pune",
    severity: "High",
    time: "5 min ago",
  },
  {
    id: "SOS-2403",
    name: "Sneha Patil",
    location: "Baner, Pune",
    severity: "Medium",
    time: "12 min ago",
  },
];

export const recentActivities = [
  {
    title: "SOS Triggered",
    time: "2 min ago",
  },
  {
    title: "Volunteer Assigned",
    time: "4 min ago",
  },
  {
    title: "Police Notified",
    time: "6 min ago",
  },
  {
    title: "Incident Resolved",
    time: "12 min ago",
  },
];