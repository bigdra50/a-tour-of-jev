// A place to try things freely. For the functions you can use, see "Available functions" in the lesson text.
const res = await jev({
  state: "Write anything you want to judge here.",
  questions: {
    example: noul("Is this a placeholder text?"),
  },
});

print(res.answers.example.noul);
