const dotenv = require("dotenv");
const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
const { message } = require("telegraf/filters");

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
let currentQuestion = null;
let awaitingAnswer = false;
let score = 0;
let filteredQuestions = [];
let currentQuestionIndex = 0;
let questions = [];

// Fetch questions from the API
const fetchQuestions = async () => {
  try {
    const response = await axios.get(
      "https://opentdb.com/api.php?amount=100&type=multiple"
    );
    questions = response.data.results;
  } catch (error) {
    console.error("Error fetching questions:", error);
  }
};

bot.start(async (ctx) => {
  await fetchQuestions();
  ctx.reply(
    "Welcome! Please select the category...",
    Markup.keyboard([
      ["Any category"],
      ["Entertainment: Video Games"],
      ["Entertainment: Japanese Anime & Manga"],
      ["Science: Computers", "Vehicles"],
      ["Geography", "Animals"],
      ["Entertainment: Comics"],
    ])
      .resize()
      .oneTime()
  );
});

// Handle text messages for category selection and answers
bot.on(message("text"), async (ctx) => {
  const userMessage = ctx.update.message.text;

  // If a category is selected
  if (!awaitingAnswer && !currentQuestion) {
    const selectedCategory = userMessage;

    console.log(selectedCategory);

    if (selectedCategory === "Any category") {
      filteredQuestions = questions;
    } else {
      filteredQuestions = questions.filter(
        (question) => question.category === selectedCategory
      );
    }

    if (filteredQuestions.length > 0) {
      currentQuestionIndex = 0; // Reset index for new category
      sendQuestion(ctx);
    } else {
      await ctx.reply(
        `No questions are available for the category ${selectedCategory}`
      );
    }
  } else if (awaitingAnswer && currentQuestion) {
    const selectedAnswer = userMessage;
    const correctAnswer = currentQuestion.correct_answer;

    awaitingAnswer = false; // Disable answer awaiting after receiving the answer

    if (selectedAnswer === correctAnswer) {
      score++;
      await ctx.reply(`Correct! Your score is ${score}`);
    } else {
      await ctx.reply(
        `Wrong! The correct answer was: ${correctAnswer} and your score is ${score}`
      );
    }

    setTimeout(() => {
      sendQuestion(ctx); // Move to the next question
    }, 1500);
  }
});

// Function to send the current question
const sendQuestion = (ctx) => {
  currentQuestion = filteredQuestions[currentQuestionIndex]; // Get current question
  currentQuestionIndex++;

  const allAnswers = shuffleArray([
    ...currentQuestion.incorrect_answers,
    currentQuestion.correct_answer,
  ]);

  const optionsKeyboard = allAnswers.map((answer) => [
    Markup.button.text(answer),
  ]);

  ctx.reply(
    currentQuestion.question,
    Markup.keyboard(optionsKeyboard).oneTime().resize()
  );

  awaitingAnswer = true; // Set to true to await user response
};

// Utility function to shuffle answers
const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
