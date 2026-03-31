"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import { fadeUp } from "./content";

export default function Gallery() {
  return (
    <motion.section
      id="gallery"
      className="pb-24 pt-24"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
    >
      <Container>
        <motion.div variants={fadeUp}>
          <SectionHeading title="Gallery Preview" />
        </motion.div>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-12">
          <motion.div variants={fadeUp} className="relative h-[440px] overflow-hidden rounded-2xl md:col-span-6">
            <Image src="/Img/pexels-apasaric-2464535.webp" alt="Large gallery tile" fill className="object-cover transition duration-500 hover:scale-105" />
          </motion.div>
          <div className="grid gap-6 md:col-span-6">
            <motion.div variants={fadeUp} className="relative h-[208px] overflow-hidden rounded-2xl">
              <Image
                src="/Img/pexels-carlos-oratto-1115158-2111255.webp"
                alt="Top right gallery tile"
                fill
                className="object-cover transition duration-500 hover:scale-105"
              />
            </motion.div>
            <motion.div variants={fadeUp} className="relative h-[208px] overflow-hidden rounded-2xl">
              <Image
                src="/Img/pexels-habib-hosseini-2908569.webp"
                alt="Bottom right gallery tile"
                fill
                className="object-cover transition duration-500 hover:scale-105"
              />
            </motion.div>
          </div>
          <motion.div variants={fadeUp} className="relative h-[180px] overflow-hidden rounded-2xl md:col-span-3">
            <Image src="/Img/pexels-soldiervip-1406766.webp" alt="Gallery block one" fill className="object-cover transition duration-500 hover:scale-105" />
          </motion.div>
          <motion.div variants={fadeUp} className="relative h-[220px] overflow-hidden rounded-2xl md:col-span-5">
            <Image src="/Img/pexels-ian-panelo-3049394.webp" alt="Gallery block two" fill className="object-cover transition duration-500 hover:scale-105" />
          </motion.div>
          <motion.div variants={fadeUp} className="relative h-[180px] overflow-hidden rounded-2xl md:col-span-4">
            <Image src="/Img/pexels-pham-hoang-kha-1582786-3785644.webp" alt="Gallery block three" fill className="object-cover transition duration-500 hover:scale-105" />
          </motion.div>
        </div>
      </Container>
    </motion.section>
  );
}
