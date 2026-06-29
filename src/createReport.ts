import fs from "fs";
import { decode } from "./screenshotSet.js";

type Options = {
  baseUrl1: string;
  baseUrl2: string;
  shotsDir: string;
  outDir: string;
};

export function createReport({
  shotsDir,
  baseUrl1,
  baseUrl2,
  outDir,
}: Options) {
  const files = fs.readdirSync(shotsDir);

  const sets = files.reduce((acc, file) => {
    const { path } = decode(file);
    if (!path) return acc;
    const value = acc[path] || [];
    value.push(file);
    acc[path] = value;
    return acc;
  }, {} as Record<string, string[]>);

  const panes = Object.entries(sets).map(([p, value]) => {
    return `
            <div class="set" data-path="${p}">
                <div class="header">
                <h2>${p}</h2>
                <p>
                    <a href="${baseUrl1}${p}" target="_blank">1</a> |
                    <a href="${baseUrl2}${p}" target="_blank">2</a>
                </p>
                </div>
                <div class="shots">
                ${value
                  .map(
                    (file) =>
                      `<a class="shot" href="${shotsDir}/${file}" target="_blank"><img src="${shotsDir}/${file}" /></a>`
                  )
                  .join("\n")}
                  </div>
            </div>
        `;
  });

  const html = `
        <html>
        <head>
        <style>
        h2 {
            margin-bottom: 0;
        }
        .set p {
            margin-top: 0;
        }
        .shots {
            display: flex;
            justify-content: space-between;
        }
        .shot {
            display: block;
            flex: 0 0 30%;
            max-height: calc(100vh - 100px);
        }
        img {
            min-width: 0;
            max-width: 100%;
            height: 100%;
            object-fit: contain;
        }
        </style>
        </head>
            <body>
                <h1>Visual Diff Report</h1>

                <p>Base URLs:</p>

                <ol>
                    <li>${baseUrl1}</li>
                    <li>${baseUrl2}</li>
                </ol>

                <p>Diff images highlight visual differences between the two base URLs.</p>

                <p>Click on an image to open that image in your browser and zoom in to see details. Use your browser's back button to get back here.</p>

                <p>This report may ommit pages that did not meet a minimum visual discrepancy threshold.</p>

                ${panes.join("\n")}
            </body>
        </html>
    `;

  fs.writeFileSync(`${outDir}/report.html`, html);
}
