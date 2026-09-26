const mongoose = require("mongoose");

const DashboardSettingsSchema = new mongoose.Schema({
  heroBadge: { type: String, default: "eLearning Platform" },
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
  }]
}, { timestamps: true });

module.exports = mongoose.model("DashboardSettings", DashboardSettingsSchema);