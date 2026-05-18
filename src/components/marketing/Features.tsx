"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Card from "@/components/ui/Card";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import { CORE_FEATURES, fadeUp } from "./content";

export default function Features() {
  return (
    <>
      <motion.section
        id="features"
        className="relative py-24"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
      >
        <Container>
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <SectionHeading title="Core Features" />
          </motion.div>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-12">
            {CORE_FEATURES.map((feature) => (
            <motion.div key={feature.title} variants={fadeUp} transition={{ duration: 0.5 }} className="md:col-span-4">
                <Card hover className="h-full bg-white/88 p-8 backdrop-blur">
                  <h3 className="text-[20px] font-medium leading-snug text-[#111111]">{feature.title}</h3>
                  <p className="mt-4 text-[16px] text-[#666666]">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </Container>
      </motion.section>

      <motion.section
        className="pb-24"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
      >
        <Container className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <motion.div variants={fadeUp} className="relative h-72 overflow-hidden rounded-lg md:col-span-6 md:h-96">
            <Image src="/Img/pexels-ian-panelo-3049394.webp" alt="Event gallery preview" fill className="object-cover transition duration-500 hover:scale-105" />
          </motion.div>
          <motion.div variants={fadeUp} className="md:col-span-6">
            <Card className="flex h-full flex-col justify-center bg-white/88 p-8 backdrop-blur">
              <h3 className="text-[32px] font-semibold leading-tight text-[#111111]">Design Fast, Deliver Confidently</h3>
              <p className="mt-4 text-[16px] text-[#666666]">
                Pixora helps teams move from raw uploads to final client delivery with structure and clarity.
              </p>
            </Card>
          </motion.div>
          <motion.div variants={fadeUp} className="md:col-span-6">
            <Card className="flex h-full flex-col justify-center bg-white/88 p-8 backdrop-blur">
              <h3 className="text-[32px] font-semibold leading-tight text-[#111111]">Everything Stays Organized</h3>
              <p className="mt-4 text-[16px] text-[#666666]">
                Keep events, folders, and selections grouped so clients always see a neat and premium interface.
              </p>
            </Card>
          </motion.div>
          <motion.div variants={fadeUp} className="relative h-72 overflow-hidden rounded-lg md:col-span-6 md:h-96">
            <Image
              src="/Img/pexels-pham-hoang-kha-1582786-3785644.webp"
              alt="Photographer managing event workflow"
              fill
              className="object-cover transition duration-500 hover:scale-105"
            />
          </motion.div>
        </Container>
      </motion.section>
    </>
  );
}
