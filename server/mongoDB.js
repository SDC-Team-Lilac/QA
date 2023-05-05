import { Schema } from 'mongoose';

const mongoose = require('mongoose');

const QuestionSchema = new Schema({
  questionId: { type: Schema.Types.ObjectId },
  questionBody: { type: String, minlength: 60, maxlength: 500 },
  date: { type: Date, default: Date.now },
  askerName: { type: String, required: true },
  questionHelpfulness: { type: Number },
  reported: { type: Boolean, default: false },
  email: { type: String, required: true },
});

export const Question = mongoose.model('Question', QuestionSchema);

const AnswerSchema = new Schema({
  answerId: { type: Schema.Types.ObjectId },
  answerBody: { type: String, minlength: 60, maxlength: 500 },
  date: { type: Date, default: Date.now },
  answererName: { type: String, required: true },
  answerHelpfulness: { type: Number },
  photos: [],
});

export const Answer = mongoose.model('Answer', AnswerSchema);
