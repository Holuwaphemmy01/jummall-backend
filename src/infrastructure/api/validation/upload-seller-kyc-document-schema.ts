import Joi from "joi";

export const uploadSellerKycDocumentSchema = Joi.object({
  document_type: Joi.string()
    .valid("proof_of_address", "id_document", "selfie", "cac_certificate")
    .required(),
  file_name: Joi.string().trim().required(),
  mime_type: Joi.string()
    .valid("image/jpeg", "image/png", "application/pdf")
    .required(),
  file_base64: Joi.string().trim().required()
});
