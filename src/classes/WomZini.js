//Adapted from on zini code from minesweeper.online

class WomZini {
  static createdWomBoardDataObject(mines, preprocessedData, applyOpeningEdgeCorrection) {
    const width = mines.length;
    const height = mines[0].length;
    const { numbersArray, openingLabels, preprocessedOpenings } =
      preprocessedData;

    let womNumbersArray = []; //1d array, going up to down and then left to right

    let womOpeningLabelsArray = []; //Works slightly different as this doesn't distinguish zeros from edges
    let womSecondaryOpeningLabelsArray = [];

    let womOpeningEdgesArray = []; //Correction to default wom algorithm

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let womNumberValue = numbersArray[x][y] === 'x' ? 10 : numbersArray[x][y];
        womNumbersArray.push(womNumberValue);

        womOpeningLabelsArray.push(0); //just initialise these
        womSecondaryOpeningLabelsArray.push(0);
        womOpeningEdgesArray.push(0);
      }
    }

    for (let [label, opening] of preprocessedOpenings.entries()) {
      //add zeros
      for (let zero of opening.zeros) {
        let womIndex = zero.y + zero.x * height;

        womOpeningLabelsArray[womIndex] = label;
      }

      //add edges
      for (let edge of opening.edges) {
        let womIndex = edge.y + edge.x * height;

        if (womOpeningLabelsArray[womIndex] === 0) {
          womOpeningLabelsArray[womIndex] = label;
          womOpeningEdgesArray[womIndex] = 1;
        } else {
          //If this square is also an edge of another opening, then put it in the double openings array
          womSecondaryOpeningLabelsArray[womIndex] = label;
        }
      }
    }

    return {
      f: [], //flags - not used by zini
      g: womOpeningLabelsArray,
      g2: womSecondaryOpeningLabelsArray,
      o: [], //squares that have been opened, not used by zini
      t: womNumbersArray,
      womOpeningEdgesArray: womOpeningEdgesArray
    };
  }

  //c215 = Func for calculating zini. 
  /*
    params
    e: (boolean) whether hzini is used
    i: object like the below with board data
    {
      f: [], flags (1 = flag, 0 = not)
      g: [], opening labels
      g2: [], squares which touch two openings
      o: [], squares that have been opened. 1 = open, 0 = closed
      t: [] numbers that squares have. 10 = mine
    },
    n: width or height
    l: width or height
    r: minecount
  */
  static c215(e, i, n, l, r, useOpEdgeCorrection) {
    if (typeof window < "u" && !("Uint8Array" in window))
      return { total: 0, clicks: [] };
    let p = n * l - r
      , o = 0
      , clicks = [] //added by me
      , d = !1
      , m = {
        t: new Uint8Array(n * l),
        f: new Uint8Array(n * l),
        o: new Uint8Array(n * l),
        g: new Uint8Array(n * l),
        g2: new Uint8Array(n * l),
        p: new Int8Array(n * l)
      };
    for (let f = 0; f < n * l; f++)
      m.t[f] = i.t[f],
        m.f[f] = 0,
        m.o[f] = 0,
        m.g[f] = i.g[f],
        m.g2[f] = i.g2[f],
        m.p[f] = 0,
        m.t[f] == 11 && (m.t[f] = 10);
    if (e) {
      let openingsLabelsClicked = [];
      for (let f = 0; f < n; f++) {
        for (let _ = 0; _ < l; _++) {
          if (m.g[f * l + _]) {
            if (!openingsLabelsClicked.includes(m.g[f * l + _])) {
              openingsLabelsClicked.push(m.g[f * l + _]);
              clicks.push({ type: 'left', x: f, y: _ });
            }
            m.o[f * l + _] = 1;
            p--;
          }
          m.g[f * l + _] > o && (o = m.g[f * l + _]);
        }
      }
      d = !0
    }
    for (let f = 0; f < n; f++)
      for (let _ = 0; _ < l; _++)
        m.p[f * l + _] = this.c216(f, _, n, l, m);
    for (; p > 0;) {
      let f = this.g250(e, n, l, m);
      if (f.premiumBestIndexes.length > 0 && f.premiumBestValue >= 0) {
        let _ = f.premiumBestIndexes[0];
        if (f.premiumBestIndexes.length > 1) {
          let P = -1;
          for (let y = 0; y < f.premiumBestIndexes.length; y++) {
            let x = f.premiumBestIndexes[y] / l | 0
              , T = f.premiumBestIndexes[y] % l
              , K = {
                t: m.t,
                o: m.o.slice(0),
                f: m.f.slice(0),
                g: m.g,
                g2: m.g2,
                p: m.p.slice(0)
              };
            this.p104(x, T, n, l, K);
            let Q = this.g250(e, n, l, K)
              , X = Q.premiumBestValue * 1e3 + Q.premiumBestIndexes.length;
            X > P && (_ = f.premiumBestIndexes[y],
              P = X)
          }
        }
        let M = _ / l | 0
          , A = _ % l
          , B = this.p104(M, A, n, l, m);
        o += B.zini,
          p += B.needToOpenCount,
          clicks = clicks.concat(B.clicks);
      } else {
        let _ = !1;
        if (!d) {
          for (let M = 0; M < n && !_; M++) {
            for (let A = 0; A < l && !_; A++) {
              if (!m.o[M * l + A] && m.t[M * l + A] == 0) {
                p -= this.o68(M, A, n, l, m);
                o++;
                _ = !0;
                clicks.push({ type: 'left', x: M, y: A });
              }
              _ || (d = !0);
            }
          }
        }
        if (d) {
          _ = !1;
          for (let M = 0; M < n && !_; M++) {
            for (let A = 0; A < l && !_; A++) {
              if (m.t[M * l + A] != 10 && !m.o[M * l + A] && !(m.g2[M * l + A] && m.t[M * l + A] > 0)) {
                p -= this.o68(M, A, n, l, m);
                o++;
                _ = !0;
                clicks.push({ type: 'left', x: M, y: A });
              }
            }
          }
          if (!_)
            return { total: o, clicks: clicks }
        }
      }
    }
    return { total: o, clicks: clicks }
  }
  //Compute an array with all the squares with max premium
  static g250(e, i, n, l) {
    let r = {
      premiumBestIndexes: [],
      premiumBestValue: -100
    };
    for (let p = 0; p < i * n; p++)
      e && !l.o[p] || (l.p[p] > r.premiumBestValue ? (r.premiumBestIndexes = [p],
        r.premiumBestValue = l.p[p]) : l.p[p] == r.premiumBestValue && r.premiumBestIndexes.push(p));
    return r
  }

  //Function to do chord and update premiums
  static p104(e, i, n, l, r) {
    let p = {
      needToOpenCount: 0,
      zini: 0,
      clicks: [] //added by me
    };
    return r.o[e * l + i] || (p.needToOpenCount -= this.o68(e, i, n, l, r),
      p.zini++, p.clicks.push({ type: 'left', x: e, y: i })),
      p.zini++,//chord click, this gets pushed at the end
      e - 1 >= 0 && i - 1 >= 0 && (r.t[(e - 1) * l + (i - 1)] == 10 && !r.f[(e - 1) * l + (i - 1)] && (this.m108(e - 1, i - 1, n, l, r),
        p.zini++, p.clicks.push({ type: 'right', x: e - 1, y: i - 1 })),
        r.t[(e - 1) * l + (i - 1)] != 10 && !r.o[(e - 1) * l + (i - 1)] && (p.needToOpenCount -= this.o68(e - 1, i - 1, n, l, r))),
      i - 1 >= 0 && (r.t[e * l + (i - 1)] == 10 && !r.f[e * l + (i - 1)] && (this.m108(e, i - 1, n, l, r),
        p.zini++, p.clicks.push({ type: 'right', x: e, y: i - 1 })),
        r.t[e * l + (i - 1)] != 10 && !r.o[e * l + (i - 1)] && (p.needToOpenCount -= this.o68(e, i - 1, n, l, r))),
      e + 1 < n && i - 1 >= 0 && (r.t[(e + 1) * l + (i - 1)] == 10 && !r.f[(e + 1) * l + (i - 1)] && (this.m108(e + 1, i - 1, n, l, r),
        p.zini++, p.clicks.push({ type: 'right', x: e + 1, y: i - 1 })),
        r.t[(e + 1) * l + (i - 1)] != 10 && !r.o[(e + 1) * l + (i - 1)] && (p.needToOpenCount -= this.o68(e + 1, i - 1, n, l, r))),
      e - 1 >= 0 && (r.t[(e - 1) * l + i] == 10 && !r.f[(e - 1) * l + i] && (this.m108(e - 1, i, n, l, r),
        p.zini++, p.clicks.push({ type: 'right', x: e - 1, y: i })),
        r.t[(e - 1) * l + i] != 10 && !r.o[(e - 1) * l + i] && (p.needToOpenCount -= this.o68(e - 1, i, n, l, r))),
      e + 1 < n && (r.t[(e + 1) * l + i] == 10 && !r.f[(e + 1) * l + i] && (this.m108(e + 1, i, n, l, r),
        p.zini++, p.clicks.push({ type: 'right', x: e + 1, y: i })),
        r.t[(e + 1) * l + i] != 10 && !r.o[(e + 1) * l + i] && (p.needToOpenCount -= this.o68(e + 1, i, n, l, r))),
      e - 1 >= 0 && i + 1 < l && (r.t[(e - 1) * l + (i + 1)] == 10 && !r.f[(e - 1) * l + (i + 1)] && (this.m108(e - 1, i + 1, n, l, r),
        p.zini++, p.clicks.push({ type: 'right', x: e - 1, y: i + 1 })),
        r.t[(e - 1) * l + (i + 1)] != 10 && !r.o[(e - 1) * l + (i + 1)] && (p.needToOpenCount -= this.o68(e - 1, i + 1, n, l, r))),
      i + 1 < l && (r.t[e * l + (i + 1)] == 10 && !r.f[e * l + (i + 1)] && (this.m108(e, i + 1, n, l, r),
        p.zini++, p.clicks.push({ type: 'right', x: e, y: i + 1 })),
        r.t[e * l + (i + 1)] != 10 && !r.o[e * l + (i + 1)] && (p.needToOpenCount -= this.o68(e, i + 1, n, l, r))),
      e + 1 < n && i + 1 < l && (r.t[(e + 1) * l + (i + 1)] == 10 && !r.f[(e + 1) * l + (i + 1)] && (this.m108(e + 1, i + 1, n, l, r),
        p.zini++, p.clicks.push({ type: 'right', x: e + 1, y: i + 1 })),
        r.t[(e + 1) * l + (i + 1)] != 10 && !r.o[(e + 1) * l + (i + 1)] && (p.needToOpenCount -= this.o68(e + 1, i + 1, n, l, r))),
      p.clicks.push({ type: 'chord', x: e, y: i }),
      p
  }
  //Compute premiums, although undercounts for op-edge squares
  static c216(e, i, n, l, r) {
    if (r.t[e * l + i] == 0 || r.t[e * l + i] == 10)
      return -100;
    let p = 0;
    return r.o[e * l + i] || (p -= 1),
      p -= 1,
      r.g[e * l + i] || (p += 1),
      e - 1 >= 0 && i - 1 >= 0 && (r.t[(e - 1) * l + (i - 1)] == 10 ? r.f[(e - 1) * l + (i - 1)] || p-- : !r.o[(e - 1) * l + (i - 1)] && !r.g[(e - 1) * l + (i - 1)] && p++),
      i - 1 >= 0 && (r.t[e * l + (i - 1)] == 10 ? r.f[e * l + (i - 1)] || p-- : !r.o[e * l + (i - 1)] && !r.g[e * l + (i - 1)] && p++),
      e + 1 < n && i - 1 >= 0 && (r.t[(e + 1) * l + (i - 1)] == 10 ? r.f[(e + 1) * l + (i - 1)] || p-- : !r.o[(e + 1) * l + (i - 1)] && !r.g[(e + 1) * l + (i - 1)] && p++),
      e - 1 >= 0 && (r.t[(e - 1) * l + i] == 10 ? r.f[(e - 1) * l + i] || p-- : !r.o[(e - 1) * l + i] && !r.g[(e - 1) * l + i] && p++),
      e + 1 < n && (r.t[(e + 1) * l + i] == 10 ? r.f[(e + 1) * l + i] || p-- : !r.o[(e + 1) * l + i] && !r.g[(e + 1) * l + i] && p++),
      e - 1 >= 0 && i + 1 < l && (r.t[(e - 1) * l + (i + 1)] == 10 ? r.f[(e - 1) * l + (i + 1)] || p-- : !r.o[(e - 1) * l + (i + 1)] && !r.g[(e - 1) * l + (i + 1)] && p++),
      i + 1 < l && (r.t[e * l + (i + 1)] == 10 ? r.f[e * l + (i + 1)] || p-- : !r.o[e * l + (i + 1)] && !r.g[e * l + (i + 1)] && p++),
      e + 1 < n && i + 1 < l && (r.t[(e + 1) * l + (i + 1)] == 10 ? r.f[(e + 1) * l + (i + 1)] || p-- : !r.o[(e + 1) * l + (i + 1)] && !r.g[(e + 1) * l + (i + 1)] && p++),
      r.g2[e * l + i] && (e - 1 >= 0 && i - 1 >= 0 && r.t[(e - 1) * l + (i - 1)] == 0 && !r.o[(e - 1) * l + (i - 1)] || i - 1 >= 0 && r.t[e * l + (i - 1)] == 0 && !r.o[e * l + (i - 1)] || e + 1 < n && i - 1 >= 0 && r.t[(e + 1) * l + (i - 1)] == 0 && !r.o[(e + 1) * l + (i - 1)] || e - 1 >= 0 && r.t[(e - 1) * l + i] == 0 && !r.o[(e - 1) * l + i] || e + 1 < n && r.t[(e + 1) * l + i] == 0 && !r.o[(e + 1) * l + i] || e - 1 >= 0 && i + 1 < l && r.t[(e - 1) * l + (i + 1)] == 0 && !r.o[(e - 1) * l + (i + 1)] || i + 1 < l && r.t[e * l + (i + 1)] == 0 && !r.o[e * l + (i + 1)] || e + 1 < n && i + 1 < l && r.t[(e + 1) * l + (i + 1)] == 0 && !r.o[(e + 1) * l + (i + 1)]) ? p + 1 : p
  }

  //Reveal square, and squares linked to opening if there are any. Also updates premiums
  static o68(e, i, n, l, r) {
    let p = 1;
    if (r.o[e * l + i] = 1,
      r.t[e * l + i] == 0) {
      for (let o = 0; o < n; o++)
        for (let d = 0; d < l; d++)
          (r.g[o * l + d] == r.g[e * l + i] || r.g2[o * l + d] == r.g[e * l + i]) && !(o == e && d == i) && (r.o[o * l + d] || (r.o[o * l + d] = 1,
            p++,
            r.t[o * l + d] != 0 && r.p[o * l + d]++),
            r.t[o * l + d] != 0 && r.p[o * l + d]--);
      return p
    }
    return r.p[e * l + i]++,
      r.g[e * l + i] || r.p[e * l + i]--,
      r.g[e * l + i] || (e - 1 >= 0 && i - 1 >= 0 && r.p[(e - 1) * l + (i - 1)]--,
        i - 1 >= 0 && r.p[e * l + (i - 1)]--,
        e + 1 < n && i - 1 >= 0 && r.p[(e + 1) * l + (i - 1)]--,
        e - 1 >= 0 && r.p[(e - 1) * l + i]--,
        e + 1 < n && r.p[(e + 1) * l + i]--,
        e - 1 >= 0 && i + 1 < l && r.p[(e - 1) * l + (i + 1)]--,
        i + 1 < l && r.p[e * l + (i + 1)]--,
        e + 1 < n && i + 1 < l && r.p[(e + 1) * l + (i + 1)]--),
      p
  }
  //Place flag and increment neighbour premiums
  static m108(e, i, n, l, r) {
    r.f[e * l + i] = 1,
      e - 1 >= 0 && i - 1 >= 0 && r.p[(e - 1) * l + (i - 1)]++,
      i - 1 >= 0 && r.p[e * l + (i - 1)]++,
      e + 1 < n && i - 1 >= 0 && r.p[(e + 1) * l + (i - 1)]++,
      e - 1 >= 0 && r.p[(e - 1) * l + i]++,
      e + 1 < n && r.p[(e + 1) * l + i]++,
      e - 1 >= 0 && i + 1 < l && r.p[(e - 1) * l + (i + 1)]++,
      i + 1 < l && r.p[e * l + (i + 1)]++,
      e + 1 < n && i + 1 < l && r.p[(e + 1) * l + (i + 1)]++
  }
};

export default WomZini;