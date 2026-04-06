"use client";

import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import { WORKFLOW_STEPS, fadeUp } from "./content";

export default function Workflow() {
  return (
    <motion.section
      id="workflow"
      className="bg-white/70 py-20"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
    >
      <Container>
        <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
          <SectionHeading
            title="How Pixora Works"
            description="Our workflow is built for event photographers who need speed and control: structure your project, share proofing access, and deliver final files without switching tools."
          />
        </motion.div>
        <div className="mt-10 grid grid-cols-1 gap-6">
          {WORKFLOW_STEPS.map((step, index) => (
            <motion.div key={step.label} variants={fadeUp} transition={{ duration: 0.5 }}>
              <Card className="p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#cde6e2] bg-[#eef6f5] text-[#0f766e]">
                      <step.Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[#0f766e]">Step {index + 1}</p>
                      <h3 className="mt-1 text-[20px] font-medium text-[#111111]">{step.label}</h3>
                      <p className="mt-2 max-w-[760px] text-[16px] text-[#666666]">{step.detail}</p>
                    </div>
                  </div>
                  <span className="inline-flex rounded-full border border-[#d7d7d7] bg-[#fafaf8] px-3 py-1 text-[13px] font-medium text-[#555555]">
                    {step.metric}
                  </span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </Container>
    </motion.section>
  );
}
