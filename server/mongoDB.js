import { Schema } from 'mongoose';

const mongoose = require('mongoose');

const QuestionSchema = new Schema({
  questionId: { type: Schema.Types.ObjectId },
  questionBody: { type: String, minlength: 60, maxlength: 500 },
  date: { type: Date, default: Date.now },
  asker_name: { type: String, required: true },
  helpfulness: { type: Number },
  reported: { type: Boolean, default: false },
  email: { type: String, required: true },
});

export const Question = mongoose.model('Question', QuestionSchema);

const AnswerSchema = new Schema({

});

export const Answer = mongoose.model('Answer', AnswerSchema);

const PhotoSchema = new Schema({

});

export const Photo = mongoose.model('Photo', PhotoSchema);
