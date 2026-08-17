import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinataSDK } from 'pinata';
import { AchievementMetadata, PinataUploadResult } from '../achievement/interfaces/achievement.interface';
import { hashAchievementJson } from '../common/utils/quiz.util';
import { createReadStream } from 'fs';
import { readFile } from 'fs/promises';

const globalScope = globalThis as typeof globalThis & {
  File?: typeof File;
  Blob?: typeof Blob;
};

@Injectable()
export class PinataService {
    private readonly pinata: PinataSDK

    constructor(private configService: ConfigService) {
        this.pinata = new PinataSDK({
            pinataJwt: this.configService.get<string>('PINATA_JWT')!,
        });
    }

    async uploadAchievementToIPFS(metadata: AchievementMetadata): Promise<PinataUploadResult> {
        const pinata = this.pinata;

        const { jsonBuffer, sha256Hex } = hashAchievementJson(metadata);

        // Build a File object from the JSON buffer so Pinata can upload it
        const BlobCtor = globalScope.Blob ?? Blob;
        const FileCtor = globalScope.File ?? File;
        const blob = new BlobCtor([jsonBuffer as unknown as BlobPart], { type: "application/json" });
        const file = new FileCtor(
            [blob],
            `achievement-${metadata.quizId}-${Date.now()}.json`,
            { type: "application/json" }
        );

        const result = await this.pinata.upload.public.file(file);

        return {
            cid: result.cid,
            contentHashHex: sha256Hex,
        };
    }

    async uploadFile(
        buffer: Buffer,
        filename: string,
        mimetype: string,
    ): Promise<{
        cid: string;
        url: string;
    }> {
        try {
            const uint8 = new Uint8Array(buffer);
            const file = new File(
                [uint8],
                filename,
                {
                    type: mimetype,
                },
            );

            const upload =
                await this.pinata.upload.public.file(file);
            console.log(upload.cid);
            return {
                cid: upload.cid,
                url: `https://gateway.pinata.cloud/ipfs/${upload.cid}`,
            };
                    } catch (error) {
            console.error("Upload file to Pinata failed:", error);
            throw error;
        }
    }
}
