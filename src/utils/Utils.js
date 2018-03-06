
const mapValue = (val, v1, v2, v3, v4) => v3 + (v4 - v3) * ((val - v1) / (v2 - v1));
const lerp = (a, b, am) =>  a + (b - a) * am;
const inside = (p, a) => {
  let ins = false;
  for (let i = 0, j = a.length - 1; i < a.length; j = i++) {
    if (a[i][1] > p[1] !== a[j][1] > p[1] && p[0] < (a[j][0] - a[i][0]) * (p[1] - a[i][1]) / (a[j][1] - a[i][1]) + a[i][0]) {
      ins = !ins;
    }
  }
  return ins;
};

export {
  lerp,
  mapValue,
  inside
};
