import {
  Collection,
  Entity,
  Loaded,
  ManyToMany,
  ManyToOne,
  MikroORM,
  OneToMany,
  PrimaryKey,
  Rel,
} from "@mikro-orm/sqlite";

@Entity()
class A {
  @PrimaryKey()
  id!: number;

  @ManyToMany(() => B, "a", { owner: true })
  b = new Collection<B>(this);
}

@Entity()
class B {
  @PrimaryKey()
  id!: number;

  @ManyToMany(() => A, "b")
  a = new Collection<A>(this);

  @ManyToOne(() => C, { nullable: true })
  c?: Rel<C>;
}

@Entity()
class C {
  @PrimaryKey()
  id!: number;

  @OneToMany(() => B, (b) => b.c)
  b = new Collection<B>(this);
}

let orm: MikroORM;

function takesALoadedA(a: Loaded<A>) {}

function takesALoadedAandB(a: Loaded<A, "b">) {}

function takesEverything(a: Loaded<A, "b" | "b.c">) {}

function takesJustNested(a: Loaded<A, "b.c">) {}

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ":memory:",
    entities: [A, B, C],
    debug: ["query", "query-params"],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

test("basic CRUD example", async () => {
  const loadedA = await orm.em.findOneOrFail(A, 1);
  takesALoadedA(loadedA);

  const loadedAB = await orm.em.findOneOrFail(A, 1, { populate: ["b"] });
  // @ts-expect-error
  takesALoadedAandB(loadedA);
  takesALoadedAandB(loadedAB);

  const loadedABC = await orm.em.findOneOrFail(A, 1, {
    populate: ["b", "b.c"],
  });
  // @ts-expect-error
  takesEverything(loadedA);
  // @ts-expect-error -- this should fail? We only have loaded 'b'
  takesEverything(loadedAB);
  takesEverything(loadedABC); // This is right

  // @ts-expect-error
  takesJustNested(loadedA);
  // @ts-expect-error -- should this fail?
  takesJustNested(loadedAB);
  takesJustNested(loadedABC);
});
