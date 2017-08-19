import { Cmd, Task } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";
import createMemoryHistory from "history/createMemoryHistory";
import Router from "mangojuice-router";


const createSharedBlock = (routes, historyOpts = {}) => {
  const SharedBlock = {
    createModel: () => ({
      router: Router.createModel()
    }),
    Logic: {
      name: "SharedBlock",
      config({ nest }) {
        return { children: {
          router: nest(Router.Logic)
            .handler(this.HandleRouter)
            .args({ createHistory: createMemoryHistory.bind(null, historyOpts) })
            .singleton(routes)
        } };
      },
      @Cmd.batch
      HandleRouter() {
      }
    }
  };
  return SharedBlock;
}

describe("Router basic usage cases", () => {
  const NewsRoutes = {
    All: Router.route('/'),
    Category: Router.route('/:category'),
  }
  const MainRoutes = {
    Home: Router.route('/', null, { default: true }),
    News: Router.route('/news', NewsRoutes),
  }
  const routes = { MainRoutes, NewsRoutes };

  it("should execute init commands in correct order and finish", async () => {
    const SharedBlock = createSharedBlock(routes);
    const { app, commands } = await runWithTracking({ app: SharedBlock });

  });
});
