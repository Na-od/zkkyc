import AnimateIn from "@/components/AnimateIn";

const stats = [
  { label: "Africans Lack ID", value: "500M+", color: "text-primary" },
  { label: "Data Stored", value: "0", color: "text-emerald-400" },
  { label: "To Verify", value: "< 2s", color: "text-primary" },
  { label: "Privacy", value: "∞", color: "text-emerald-400" },
];

const StatsSection = () => (
  <section className="w-full border-y border-border/50 py-16 bg-secondary/20">
    <div className="container mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
      {stats.map((stat, i) => (
        <AnimateIn key={i} delay={i * 100}>
          <div className="space-y-2">
            <div className={`text-4xl font-bold tracking-tight ${stat.color}`}>
              {stat.value}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-medium">
              {stat.label}
            </div>
          </div>
        </AnimateIn>
      ))}
    </div>
  </section>
);

export default StatsSection;
