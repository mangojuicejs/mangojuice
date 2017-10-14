import { Cmd, Task } from "mangojuice-core";
import { runWithTracking } from "mangojuice-test";
import createMemoryHistory from "history/createMemoryHistory";
import Router from "mangojuice-router";


const createSharedBlock = (rootRoutes, historyOpts = {}) => {
  const SharedBlock = {
    createModel: () => ({
      router: Router.createModel()
    }),
    Logic: {
      name: "SharedBlock",
      children() {
        return {
          router: this.nest(Router.createLogic(rootRoutes))
            .handler(this.HandleRouter)
            .args({ createHistory: createMemoryHistory.bind(null, historyOpts) })
            .singleton()
        };
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
    Articles: Router.route('/articles', null, { default: true }),
    News: Router.route('/news', NewsRoutes),
  }
  const DefaultRoutes = {
    Root: Router.route('/', null, { default: true }),
  }

  it("should activate default non root route", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commands } = await runWithTracking({ app: SharedBlock });

    expect(Router.isActive(app.model.router, MainRoutes.Articles)).toBeTruthy();
    expect(Router.isActive(app.model.router, MainRoutes.News)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.All)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.Category)).toBeFalsy();
  });

  it("should recognize nested route on startup", async () => {
    const SharedBlock = createSharedBlock(MainRoutes, { initialEntries: [ '/news/123' ] });
    const { app, commands } = await runWithTracking({ app: SharedBlock });

    expect(Router.isActive(app.model.router, MainRoutes.Articles)).toBeFalsy();
    expect(Router.isActive(app.model.router, MainRoutes.News)).toBeTruthy();
    expect(Router.isActive(app.model.router, NewsRoutes.All)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.Category)).toBeTruthy();
    expect(app.model.router.params).toEqual({ category: '123' });
  });

  it("should recognize not found route at root", async () => {
    const SharedBlock = createSharedBlock(MainRoutes, { initialEntries: [ '/some_page' ] });
    const { app, commands } = await runWithTracking({ app: SharedBlock });

    expect(Router.isActive(app.model.router, MainRoutes.Articles)).toBeFalsy();
    expect(Router.isActive(app.model.router, MainRoutes.News)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.All)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.Category)).toBeFalsy();
    expect(Router.isNotFound(app.model.router)).toBeTruthy();
  });

  it("should recognize not found route at nested level", async () => {
    const SharedBlock = createSharedBlock(MainRoutes, { initialEntries: [ '/news/category/123' ] });
    const { app, commands } = await runWithTracking({ app: SharedBlock });

    expect(Router.isActive(app.model.router, MainRoutes.Articles)).toBeFalsy();
    expect(Router.isActive(app.model.router, MainRoutes.News)).toBeTruthy();
    expect(Router.isActive(app.model.router, NewsRoutes.All)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.Category)).toBeFalsy();
    expect(Router.isNotFound(app.model.router)).toBeFalsy();
    expect(Router.isNotFound(app.model.router, NewsRoutes)).toBeTruthy();
  });

  it("should be able to change the route", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });

    await app.proc.exec(NewsRoutes.Category({ category: '321' }));

    expect(Router.isChanged(app.model.router, MainRoutes.News)).toBeTruthy();
    expect(Router.isChanged(app.model.router, NewsRoutes.Category)).toBeTruthy();
    expect(Router.isLeft(app.model.router, MainRoutes.Articles)).toBeTruthy();
    expect(Router.isActive(app.model.router, MainRoutes.Articles)).toBeFalsy();
    expect(Router.isActive(app.model.router, MainRoutes.News)).toBeTruthy();
    expect(Router.isActive(app.model.router, NewsRoutes.All)).toBeFalsy();
    expect(Router.isActive(app.model.router, NewsRoutes.Category)).toBeTruthy();
    expect(app.model.router.params).toEqual({ category: '321' });
  });

  it("should provide a way to create a link", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });

    const cmd = NewsRoutes.Category({ category: '321' });
    const link = Router.link(app.model.router, cmd);

    expect(link).toEqual({ onClick: cmd, href: '/news/321/' });
  });

  it("should provide a way to create a link with command creator", async () => {
    const SharedBlock = createSharedBlock(MainRoutes);
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });

    const cmd = NewsRoutes.All;
    const link = Router.link(app.model.router, cmd);

    expect(link).toEqual({ onClick: cmd, href: '/news/' });
  });

  it("should keep search query on default route redirection", async () => {
    const SharedBlock = createSharedBlock(DefaultRoutes, { initialEntries: [ '/?utm_campaign=tbbe' ] });
    const { app, commandNames } = await runWithTracking({ app: SharedBlock });

    expect(Router.isActive(app.model.router, DefaultRoutes.Root)).toBeTruthy();
    expect(app.model.router.query).toEqual({ utm_campaign: 'tbbe' });
  });
});
