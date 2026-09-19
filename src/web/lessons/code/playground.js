// 自由に試す場所です。使える関数は下の「使える関数」を見てください。
const res = await jev({
  state: "Write anything you want to judge here.",
  questions: {
    example: noul("Is this a placeholder text?"),
  },
});

print(res.answers.example.noul);
