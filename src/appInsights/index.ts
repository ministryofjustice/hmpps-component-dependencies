import { AppInsights } from "./Client";
import Queries from "./queries";

const appInsights = new AppInsights(
  process.env.APP_ID as string,
  process.env.APP_KEY as string
);

const getTable = async (query: string) => appInsights.query(query);

export const getDependencies = async () => getTable(Queries.DEPENDENCIES())
