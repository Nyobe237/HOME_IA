import { continueRender, delayRender, staticFile } from "remotion";

const FACES: Array<[string, string, string]> = [
  ["Inter", "Inter-Regular.otf", "400"],
  ["Inter", "Inter-Medium.otf", "500"],
  ["Inter", "Inter-SemiBold.otf", "600"],
  ["Inter", "Inter-Bold.otf", "700"],
  ["Inter", "Inter-ExtraBold.otf", "800"],
  ["Inter Display", "InterDisplay-SemiBold.otf", "600"],
  ["Inter Display", "InterDisplay-Bold.otf", "700"],
  ["Inter Display", "InterDisplay-ExtraBold.otf", "800"],
];

let loaded = false;
/** Charge les polices embarquées (public/fonts) avant le rendu de la première image. */
export const loadFonts = () => {
  if (loaded || typeof document === "undefined") return;
  loaded = true;
  const handle = delayRender("Chargement des polices Inter");
  Promise.all(
    FACES.map(([family, file, weight]) => {
      const face = new FontFace(family, `url(${staticFile(`fonts/${file}`)})`, { weight });
      return face.load().then((f) => (document.fonts as unknown as { add: (x: FontFace) => void }).add(f));
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
};
