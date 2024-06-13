import {
  Collection,
  Entity,
  Loaded,
  ManyToOne,
  MikroORM,
  OneToMany,
  PrimaryKey,
  Ref,
} from "@mikro-orm/sqlite";

@Entity()
class A {
  @PrimaryKey()
  id!: number;

  @OneToMany(() => B, (b) => b.a)
  b = new Collection<B>(this);
}

@Entity()
class B {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => A, { ref: true })
  a!: Ref<A>;

  @OneToMany(() => C, (c) => c.b)
  c = new Collection<C>(this);
}

@Entity()
class C {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => B, { ref: true })
  b!: Ref<B>;

  @OneToMany(() => D, (d) => d.c)
  d = new Collection<D>(this);
}

@Entity()
class D {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => C, { ref: true })
  c!: Ref<C>;
}

let orm: MikroORM;

function requireBCD(a: Loaded<A, "b.c.d">) {}

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ":memory:",
    entities: [A, B, C, D],
    debug: ["query", "query-params"],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

test("basic CRUD example", async () => {
  const loadedAB = await orm.em.findOneOrFail(A, 1, { populate: ["b"] });
  const loadedABC = await orm.em.findOneOrFail(A, 1, { populate: ["b.c"] });
  const loadedABCD = await orm.em.findOneOrFail(A, 1, { populate: ["b.c.d"] });

  // @ts-expect-error
  requireBCD(loadedAB);
  // @ts-expect-error -- should this fail? because `d` does not populated
  requireBCD(loadedABC);
  requireBCD(loadedABCD);
});
