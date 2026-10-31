
/*
FOOTBALL INTELLIGENCE AI
Prediction Engine
Developer: Garba Numbeya
*/

// Calculate Poisson probability
function poissonProbability(goals, expectedGoals) {
  let factorial = 1;

  for (let i = 1; i <= goals; i++) {
    factorial *= i;
  }

  return (
    Math.exp(-expectedGoals) *
    Math.pow(expectedGoals, goals) /
    factorial
  );
}

// Generate match predictions
function predictMatch(homeGoals, awayGoals) {
  if (
    !Number.isFinite(homeGoals) ||
    !Number.isFinite(awayGoals) ||
    homeGoals < 0 ||
    awayGoals < 0 ||
    homeGoals > 6 ||
    awayGoals > 6
  ) {
    throw new Error("Expected goals must be between 0 and 6.");
  }

  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  let over25 = 0;
  let btts = 0;

  for (let h = 0; h <= 10; h++) {
    for (let a = 0; a <= 10; a++) {
      const probability =
        poissonProbability(h, homeGoals) *
        poissonProbability(a, awayGoals);

      if (h > a) homeWin += probability;
      else if (h === a) draw += probability;
      else awayWin += probability;

      if (h + a >= 3) over25 += probability;
      if (h > 0 && a > 0) btts += probability;
    }
  }

  const outcomes = [
    { name: "Home Win", probability: homeWin },
    { name: "Draw", probability: draw },
    { name: "Away Win", probability: awayWin }
  ];

  outcomes.sort((x, y) =>
    y.probability - x.probability
  );

  return {
    homeWin: +(homeWin * 100).toFixed(2),
    draw: +(draw * 100).toFixed(2),
    awayWin: +(awayWin * 100).toFixed(2),
    over25: +(over25 * 100).toFixed(2),
    under25: +((1 - over25) * 100).toFixed(2),
    bttsYes: +(btts * 100).toFixed(2),
    bttsNo: +((1 - btts) * 100).toFixed(2),
    leadingOutcome: outcomes[0].name,
    model: "Poisson Probability Model",
    warning: "Estimates only. Not guaranteed outcomes."
  };
}

// Example test
const example = predictMatch(1.6, 1.1);

console.log("FOOTBALL INTELLIGENCE AI");
console.log(example);
       
