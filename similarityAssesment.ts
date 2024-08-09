import * as fs from "fs";
import { parse } from "@fast-csv/parse";
import { writeToPath } from "@fast-csv/format";
import { AzureOpenAIEmbeddings } from "@langchain/azure-openai";
import path from "path";
import { env } from "process";
const azureOpenAIEmbeddings = new AzureOpenAIEmbeddings({
  azureOpenAIEndpoint: env.azureOpenAIEndpoint!,
  azureOpenAIApiKey: env.azureOpenAIApiKey!,
  azureOpenAIApiVersion: env.azureOpenAIApiVersion!,
  azureOpenAIApiDeploymentName: env.embeddingsModelName!,
  });
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce(
    (sum, a, idx) => sum + a * (vecB[idx] ?? 0),
    0
    );
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(
    vecB.reduce((sum, b) => sum + (b ?? 0) * (b ?? 0), 0)
    );
  return dotProduct / (magnitudeA * magnitudeB);
}
  async function similarityEvaluation(
  output: string,
  expectedOutput: string
  ): Promise<{ similarity: number; details: any }> {
  try {
  const [outputEmbedding, expectedOutputEmbedding] = await Promise.all([
  azureOpenAIEmbeddings.embedQuery(output),
  azureOpenAIEmbeddings.embedQuery(expectedOutput),
  ]);
  const outputVector = outputEmbedding;
  const expectedOutputVector = expectedOutputEmbedding;
  const similarity = cosineSimilarity(outputVector, expectedOutputVector);
  return { similarity, details: { outputVector, expectedOutputVector } };
  } catch (error) {
  console.error(
    "Error generating embeddings or calculating similarity:",
    error
    );
  return { similarity: 0, details: { error } };
  }
  }

  async function readCsv(filePath: string): Promise<any[]> {
  const results: any[] = [];
  
  return new Promise((resolve, reject) => {
  fs.createReadStream(filePath)
  .pipe(parse({ headers: true }))
  .on("data", (data: any) => {
  // Trim field names, values, and remove extra quotes from data
  const trimmedData = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
    key.trim().replace(/^['"]|['"]$/g, ""),
    typeof value === "string"
    ? value.trim().replace(/^['"]|['"]$/g, "")
    : value,
    ])
    );
  results.push(trimmedData);
    })
    .on("end", () => resolve(results))
    .on("error", (error: any) => reject(error));
    });
    }
  export async function compareAnswers() {
    const file1 = path.resolve(__dirname, "path/to/file.csv");
    const file2 = path.resolve(__dirname, "path/to/file.csv");
    const outputFile = path.resolve(__dirname, "output.csv");
    try {
    const data1 = await readCsv(file1);
    const data2 = await readCsv(file2);
    const outputData = [];
    for (const item1 of data1) {
    console.log(
    `Processing ID: ${item1.ID}, questionStub: ${item1.questionStub}, question:
    ${item1.question}`
    );
    const item2 = data2.find(
    (item) =>
    item.ID === item1.ID &&
    item.questionStub === item1.questionStub &&
    item.question === item1.question
    );
    if (item2) {
    const { similarity } = await similarityEvaluation(
    String(item1.response),
    String(item2.response)
    );
    outputData.push({
    ID: item1.ID,
    questionStub: item1.questionStub,
    question: item1.question,
    response1: item1.response,
    response2: item2.response,
    similarityScore: similarity,
    });
    } else {
    console.warn(
    `No matching rfpID, questionStub, and question found for item1: ${JSON.stringify(
    item1
    
    )}`
    );
    }
    }
    await writeToPath(outputFile, outputData, {
    headers: [
    "ID",
    "questionStub",
    "question",
    "response1",
    "response2",
    "similarityScore",
    ],
    });
    } catch (error) {
    console.error("Error comparing answers:", error);
  }
  }
  export { similarityEvaluation, readCsv, cosineSimilarity, writeToPath };
