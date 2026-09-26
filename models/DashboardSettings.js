const mongoose = require("mongoose");

const DashboardSettingsSchema = new mongoose.Schema({
  heroBadge: { type: String, default: "eLearning Platform" },
  // Title Colors
  // Light Mode Colors
  titleColor1: { type: String, default: "#0f172a" },
  titleColor2: { type: String, default: "#0f172a" },
  highlightColor: { type: String, default: "#f97316" },
  // Dark Mode Colors සඳහා නව ක්ෂේත්‍ර
  darkTitleColor1: { type: String, default: "#ffffff" },
  darkTitleColor2: { type: String, default: "#ffffff" },
  darkHighlightColor: { type: String, default: "#fb923c" },
  heroTitleLine1: { type: String, default: "Smart Learning" },
  heroTitleLine2: { type: String, default: "Deeper & More" },
  heroTitleHighlight: { type: String, default: "-Amazing" },
  heroDescription: { 
    type: String, 
    default: "Phosfluorescently deploy unique intellectual capital without enterprise- after bricks & clicks synergy. Enthusiastically revolutionize intuitive." 
  },
  primaryBtnText: { type: String, default: "Start Free Trial" },
  primaryBtnUrl: { type: String, default: "#" },
  secondaryBtnText: { type: String, default: "How it Work" },
  // For the four images and the text displayed next to the badge
  badgeAvatars: [{
    image: { type: String, default: "" }
  }],
  badgeText: { type: String, default: "+3000 students worldwide" },
  // Images for Hero Carousel & Gallery
  heroImages: [{
    id: Number,
    image: String,
    title: String
  }],
  galleryItems: [{
    image: String,
    text: String
  }],
  // Social Media Links
  socialLinks: [{
    platform: { type: String, required: true },
    url: { type: String, default: "" }
  }],
  // What our clients say
  testimonials: [{
    image: { type: String, default: "" },
    name: { type: String, default: "" },
    title: { type: String, default: "" },
    idea: { type: String, default: "" },
    rating: { type: Number, default: 5 }
  }]
}, { timestamps: true });

module.exports = mongoose.model("DashboardSettings", DashboardSettingsSchema);