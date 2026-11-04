/**
 * FMCG Order Demand & Scheme Engine (Module 5 & Module 3 Standalone Package)
 *
 * Core Capabilities:
 * 1. AI Multimodal Order Capture (Hinglish/Hindi/English NLP, Paper Slip OCR, Voice Notes)
 * 2. Ambiguity & Unit Resolution (Ask, Never Guess - Case vs Loose Pack, Cut-Pack Rounding)
 * 3. Trade Scheme Calculation Engine (Buy X Get Y Free, Multi-Tier Slabs, Flat Cash Rebates)
 * 4. 50/50 Madhya Pradesh GST & Half-Up Epsilon Tax Invoice Math
 * 5. Standalone Adapter for Custom Machine Learning Microservices (spaCy, BERT, PyTorch, LLMs)
 */

// AI & NLP Demand Parsers
export * from "./ai/text-parser";
export * from "./ai/candidate-retriever";
export * from "./ai/calibrated-scorer";
export * from "./ai/gemini-chooser";
export * from "./ai/cascaded-parser";
export * from "./ai/types";
export * from "./ai/pipeline";
export * from "./ai/gemini";

// Trade Scheme & Tax Pricing Engine
export * from "./schemes/engine";

// Object Storage for Audit Slips & Voice Notes
export * from "./storage/s3";

// Catalog Reference Data
export * from "./data/catalog";
