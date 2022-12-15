import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { validate as isUUID } from 'uuid';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const product = this.productRepository.create(createProductDto);
      await this.productRepository.save(product);
      return product;
    } catch (e) {
      handleDBExceptions(e);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    return await this.productRepository.find({ take: limit, skip: offset });
  }

  async findOne(term: string) {
    let product: Product;
    if (isUUID(term)) {
      product = await this.productRepository.findOneBy({ id: term });
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder();
      product = await queryBuilder
        .where('UPPER(title)=:title or slug=:slug', {
          title: term.toLocaleUpperCase(),
          slug: term.toLocaleLowerCase(),
        })
        .getOne();
    }
    if (!product) throw new NotFoundException(`Product with ${term} not found`);
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.preload({
      id: id,
      ...updateProductDto,
    });
    if (!product)
      throw new NotFoundException(`Product with id ${id} not found`);

    try {
      await this.productRepository.save(product);
    } catch (e) {
      handleDBExceptions(e);
    }

    return product;
  }

  async remove(id: string) {
    //const product = await this.productRepository.findOne({ where: { id } });
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
    return `This action removes a #${id} product`;
  }
}

function handleDBExceptions(error: any) {
  //console.log(e);
  if (error.code === `23505`) throw new BadRequestException(error.detail);
  this.logger.error(error);
  throw new InternalServerErrorException(`Unexpexted error, check server logs`);
}
